import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { useData } from "../../../context/DataContext";

const DateCleanerContent = ({ onCloseModal }) => {
  const { events, deleteEvent } = useData();
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");

  const handleDelete = (mode) => {
    const targetDate = mode === "before" ? beforeDate : afterDate;
    if (!targetDate) return;

    const eventsToDelete = events.filter((ev) => {
      if (!ev.date) return false;
      if (mode === "before") return ev.date < targetDate;
      return ev.date > targetDate;
    });

    if (eventsToDelete.length === 0) {
      alert("No events found in that range.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${eventsToDelete.length} events ${mode} ${targetDate}?`,
      )
    ) {
      return;
    }

    eventsToDelete.forEach((ev) => {
      if (ev.id) deleteEvent(ev.id);
    });

    alert(`Deleted ${eventsToDelete.length} events.`);
    onCloseModal();
  };

  const inputClass = "w-full p-2 text-xs rounded-lg border-input surface-input text-input";
  const labelClass = "text-[10px] font-bold uppercase tracking-wider text-secondary";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={labelClass}>
          Delete Before
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={beforeDate}
            onChange={(e) => setBeforeDate(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={() => handleDelete("before")}
            disabled={!beforeDate}
            className="p-2 rounded-lg disabled:opacity-50 transition-colors btn-danger-icon"
          >
            <Trash2 className="icon-sm" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>
          Delete After
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={afterDate}
            onChange={(e) => setAfterDate(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={() => handleDelete("after")}
            disabled={!afterDate}
            className="p-2 rounded-lg disabled:opacity-50 transition-colors btn-danger-icon"
          >
            <Trash2 className="icon-sm" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-center leading-tight pt-1 text-muted">
        This action is permanent.
      </p>
    </div>
  );
};

export default DateCleanerContent;