import { useMemo } from "react";

export default function PollBuilder({
  enabled,
  question,
  options,
  allowMulti,
  closesAt,
  onToggle,
  onQuestionChange,
  onOptionChange,
  onAllowMultiChange,
  onClosesAtChange,
  onAddOption,
  onRemoveOption,
}) {
  const cleanedOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options]
  );

  return (
    <section className="poll-builder">
      <label className="switch-row">
        <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
        <span>Create poll with this message</span>
      </label>

      {enabled ? (
        <div className="poll-fields">
          <input
            value={question}
            placeholder="Poll question"
            onChange={(event) => onQuestionChange(event.target.value)}
          />

          {options.map((option, index) => (
            <div key={index} className="poll-option-row">
              <input
                value={option}
                placeholder={`Option ${index + 1}`}
                onChange={(event) => onOptionChange(index, event.target.value)}
              />
              {options.length > 2 ? (
                <button type="button" className="button button--ghost" onClick={() => onRemoveOption(index)}>
                  Remove
                </button>
              ) : null}
            </div>
          ))}

          <button type="button" className="button button--ghost" onClick={onAddOption}>
            Add option
          </button>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={allowMulti}
              onChange={(event) => onAllowMultiChange(event.target.checked)}
            />
            <span>Allow multi-select vote</span>
          </label>

          <input
            type="datetime-local"
            value={closesAt}
            onChange={(event) => onClosesAtChange(event.target.value)}
            placeholder="Optional close time"
          />

          <p className="tiny-note">Active options: {cleanedOptions.length} (minimum 2)</p>
        </div>
      ) : null}
    </section>
  );
}
