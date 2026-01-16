import { useState, useEffect, useRef, useCallback } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { generateSyncCode } from "../utils/helpers";

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CHUNK_SIZE = 16384;
const HEARTBEAT_INTERVAL = 5000;
const CONNECTION_TIMEOUT = 15000;

export const usePlannerSync = (firebaseState, dataState) => {
  const { db, user, appId } = firebaseState;
  const { events, classColors, hiddenClasses, changeLog, syncWithRemote } =
    dataState;

  const [syncCode, setSyncCode] = useState(null);
  const [syncStatus, setSyncStatus] = useState("disconnected");
  const [activePeers, setActivePeers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const peerConnections = useRef(new Map());
  const dataChannels = useRef(new Map());
  const incomingChunks = useRef(new Map());
  const lastHeartbeat = useRef(new Map());
  const pendingCandidates = useRef(new Map());

  const heartbeatTimer = useRef(null);
  const roomLivenessTimer = useRef(null);
  const unsubscribes = useRef([]);

  useEffect(() => {
    return () => cleanupRTC();
  }, []);

  const cleanupRTC = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    dataChannels.current.forEach((dc) => dc.close());
    dataChannels.current.clear();

    incomingChunks.current.clear();
    lastHeartbeat.current.clear();
    pendingCandidates.current.clear();

    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    if (roomLivenessTimer.current) clearInterval(roomLivenessTimer.current);

    unsubscribes.current.forEach((unsub) => unsub());
    unsubscribes.current = [];

    setSyncStatus("disconnected");
    setSyncCode(null);
    setActivePeers([]);
    setErrorMsg("");
  }, []);

  // --- Data Channel Logic ---
  const handleRemoteUpdate = (data) => {
    if (syncWithRemote) syncWithRemote(data);
  };

  const handleDataMessage = useCallback(
    (peerId, event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "PING") {
          dataChannels.current
            .get(peerId)
            ?.send(JSON.stringify({ type: "PONG" }));
          lastHeartbeat.current.set(peerId, Date.now());
          return;
        }
        if (msg.type === "PONG") {
          lastHeartbeat.current.set(peerId, Date.now());
          return;
        }

        if (msg.type === "CHUNK") {
          if (!incomingChunks.current.has(peerId)) {
            incomingChunks.current.set(peerId, {
              chunks: [],
              count: 0,
              total: msg.total,
            });
          }

          const transfer = incomingChunks.current.get(peerId);
          if (!transfer.chunks) transfer.chunks = new Array(msg.total);

          transfer.chunks[msg.index] = msg.data;
          transfer.count++;

          if (transfer.count === msg.total) {
            const fullData = transfer.chunks.join("");
            incomingChunks.current.delete(peerId);
            handleRemoteUpdate(JSON.parse(fullData));
          }
          return;
        }

        if (msg.type === "SYNC_UPDATE") {
          handleRemoteUpdate(msg);
        }
      } catch (e) {
        console.error("Sync parse error", e);
      }
    },
    [syncWithRemote],
  );

  const sendToPeer = (peerId, payload) => {
    const channel = dataChannels.current.get(peerId);
    if (!channel || channel.readyState !== "open") return;

    const json = JSON.stringify(payload);

    if (json.length > CHUNK_SIZE) {
      const total = Math.ceil(json.length / CHUNK_SIZE);
      for (let i = 0; i < total; i++) {
        const chunk = json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        channel.send(
          JSON.stringify({
            type: "CHUNK",
            index: i,
            total: total,
            data: chunk,
          }),
        );
      }
    } else {
      channel.send(json);
    }
  };

  const broadcastSyncData = useCallback(() => {
    const payload = {
      type: "SYNC_UPDATE",
      events,
      classColors,
      hiddenClasses,
      changeLog,
      timestamp: Date.now(),
    };
    dataChannels.current.forEach((_, peerId) => sendToPeer(peerId, payload));
  }, [events, classColors, hiddenClasses, changeLog]);

  useEffect(() => {
    if (syncStatus === "active" || syncStatus === "connected") {
      const t = setTimeout(() => broadcastSyncData(), 500);
      return () => clearTimeout(t);
    }
  }, [broadcastSyncData, syncStatus]);

  useEffect(() => {
    heartbeatTimer.current = setInterval(() => {
      const now = Date.now();
      dataChannels.current.forEach((dc, peerId) => {
        if (dc.readyState === "open") {
          dc.send(JSON.stringify({ type: "PING" }));
          const last = lastHeartbeat.current.get(peerId) || now;

          if (now - last > CONNECTION_TIMEOUT) {
            console.warn(`Peer ${peerId} timed out.`);
            dc.close();
            peerConnections.current.get(peerId)?.close();
            dataChannels.current.delete(peerId);
            peerConnections.current.delete(peerId);
            setActivePeers((prev) => prev.filter((p) => p !== peerId));
          }
        }
      });
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(heartbeatTimer.current);
  }, []);

  const flushCandidates = (peerId, pc) => {
    if (pendingCandidates.current.has(peerId)) {
      const cands = pendingCandidates.current.get(peerId);
      cands.forEach((c) => {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) =>
          console.warn("Candidate Flush Error", e),
        );
      });
      pendingCandidates.current.delete(peerId);
    }
  };

  const createPeerConnection = (peerId, initiator) => {
    if (peerConnections.current.has(peerId))
      return peerConnections.current.get(peerId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current.set(peerId, pc);
    lastHeartbeat.current.set(peerId, Date.now());

    pc.onicecandidate = (event) => {
      if (event.candidate && syncCode) {
        const coll = collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "signaling",
          syncCode,
          "candidates",
        );
        addDoc(coll, {
          target: peerId,
          sender: user.uid,
          candidate: JSON.stringify(event.candidate),
        }).catch((e) => console.error("Candidate write failed", e));
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        if (!activePeers.includes(peerId))
          setActivePeers((prev) => [...prev, peerId]);
        setSyncStatus("connected");
        setErrorMsg("");
      } else if (state === "disconnected" || state === "failed") {
        setActivePeers((prev) => prev.filter((p) => p !== peerId));
      }
    };

    if (initiator) {
      const channel = pc.createDataChannel("planner_sync");
      setupChannel(peerId, channel);
    } else {
      pc.ondatachannel = (e) => setupChannel(peerId, e.channel);
    }

    return pc;
  };

  const setupChannel = (peerId, channel) => {
    dataChannels.current.set(peerId, channel);
    channel.onmessage = (e) => handleDataMessage(peerId, e);

    const onOpen = () => {
      const payload = {
        type: "SYNC_UPDATE",
        events,
        classColors,
        hiddenClasses,
        changeLog,
        timestamp: Date.now(),
      };
      sendToPeer(peerId, payload);
    };

    if (channel.readyState === "open") {
      onOpen();
    } else {
      channel.onopen = onOpen;
    }
  };

  const addIceCandidateSafely = (peerId, candidate) => {
    const pc = peerConnections.current.get(peerId);
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) =>
        console.error("Add candidate error", e),
      );
    } else {
      if (!pendingCandidates.current.has(peerId))
        pendingCandidates.current.set(peerId, []);
      pendingCandidates.current.get(peerId).push(candidate);
    }
  };

  const createSyncSession = useCallback(
    async (customCode, password) => {
      if (!db || !user) return;
      cleanupRTC();

      const code = customCode || generateSyncCode();
      setSyncCode(code);
      setSyncStatus("connecting");

      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "signaling",
        code,
      );

      try {
        const offers = await getDocs(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "signaling",
            code,
            "offers",
          ),
        );
        offers.forEach((d) => deleteDoc(d.ref));
        const cands = await getDocs(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "signaling",
            code,
            "candidates",
          ),
        );
        cands.forEach((d) => deleteDoc(d.ref));
      } catch (e) {
        console.warn("Cleanup warning", e);
      }

      await setDoc(docRef, {
        created: Date.now(),
        last_seen: Date.now(),
        hostId: user.uid,
        password: password || "",
        peers: [],
      });

      roomLivenessTimer.current = setInterval(() => {
        updateDoc(docRef, { last_seen: Date.now() }).catch(console.error);
      }, 5000);

      const unsubRoom = onSnapshot(
        docRef,
        async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();

          if (data.peers) {
            data.peers.forEach(async (peerId) => {
              if (peerId !== user.uid && !peerConnections.current.has(peerId)) {
                const pc = createPeerConnection(peerId, true);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const offerColl = collection(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  "signaling",
                  code,
                  "offers",
                );
                await addDoc(offerColl, {
                  to: peerId,
                  from: user.uid,
                  type: "offer",
                  sdp: JSON.stringify(offer),
                });
              }
            });
          }
        },
        (err) => {
          if (err.code === "permission-denied") {
            setSyncStatus("error");
            setErrorMsg("Permission Denied: Cannot listen to Room");
          }
        },
      );
      unsubscribes.current.push(unsubRoom);

      const offerColl = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "signaling",
        code,
        "offers",
      );
      const unsubOffers = onSnapshot(offerColl, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.to === user.uid && data.type === "answer") {
              const pc = peerConnections.current.get(data.from);
              if (pc && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(JSON.parse(data.sdp));
                flushCandidates(data.from, pc);
              }
            }
          }
        });
      });
      unsubscribes.current.push(unsubOffers);

      const candColl = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "signaling",
        code,
        "candidates",
      );
      const unsubCands = onSnapshot(candColl, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.target === user.uid) {
              addIceCandidateSafely(data.sender, JSON.parse(data.candidate));
            }
          }
        });
      });
      unsubscribes.current.push(unsubCands);

      setSyncStatus("active");
    },
    [db, user, appId, cleanupRTC, events],
  );

  const joinSyncSession = useCallback(
    async (code, password) => {
      if (!db || !user || !code) return;

      cleanupRTC();

      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "signaling",
        code,
      );
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new Error("Room not found");
      }

      const sessionData = snap.data();

      if (sessionData.hostId === user.uid) {
        console.log("User is existing Host. Reclaiming session...");
        await createSyncSession(code, password);
        return;
      }

      if (sessionData.password && sessionData.password !== password) {
        throw new Error("Invalid Password");
      }

      const lastSeen = sessionData.last_seen || 0;
      if (Date.now() - lastSeen > 30000) {
        throw new Error("Room is inactive");
      }

      setSyncCode(code);
      setSyncStatus("connecting");

      await updateDoc(docRef, { peers: arrayUnion(user.uid) });

      const offerColl = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "signaling",
        code,
        "offers",
      );
      const unsubOffers = onSnapshot(
        offerColl,
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (data.to === user.uid && data.type === "offer") {
                const pc = createPeerConnection(data.from, false);

                if (pc.signalingState !== "stable") {
                  await pc.setRemoteDescription(JSON.parse(data.sdp));
                  flushCandidates(data.from, pc);

                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);

                  await addDoc(offerColl, {
                    to: data.from,
                    from: user.uid,
                    type: "answer",
                    sdp: JSON.stringify(answer),
                  });
                }
              }
            }
          });
        },
        (err) => {
          if (err.code === "permission-denied") {
            setSyncStatus("error");
            setErrorMsg("Permission Denied: Cannot listen to Offers");
          }
        },
      );
      unsubscribes.current.push(unsubOffers);

      const candColl = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "signaling",
        code,
        "candidates",
      );
      const unsubCands = onSnapshot(candColl, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.target === user.uid) {
              addIceCandidateSafely(data.sender, JSON.parse(data.candidate));
            }
          }
        });
      });
      unsubscribes.current.push(unsubCands);
    },
    [db, user, appId, cleanupRTC, events, createSyncSession],
  );

  return {
    syncCode,
    syncStatus,
    activePeersCount: activePeers.length,
    createSyncSession,
    joinSyncSession,
    leaveSyncSession: cleanupRTC,
    errorMsg,
  };
};
