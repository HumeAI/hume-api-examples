import { None, Optional } from "../../lib/utilities/typeUtilities";

import { ChangeEvent } from "react";

type TextAreaProps = {
  className?: string;
  inputClassName?: string;
  text: string;
  placeholder?: string;
  onChange: Optional<(text: string) => void>;
  readOnly: boolean;
};

export function TextArea({ className, inputClassName, text, placeholder, onChange, readOnly }: TextAreaProps) {
  className = className || "";
  inputClassName = inputClassName || "";

  function onInput(e: ChangeEvent<HTMLTextAreaElement>) {
    if (onChange) {
      onChange(e.target.value);
    }
  }

  return (
    <div
      className={`flex items-center justify-between rounded-md border border-neutral-300 bg-white shadow duration-200 hover:ease-linear ${className}`}
    >
      <textarea
        className={`text-md h-full w-full resize-none bg-transparent p-3 font-medium placeholder-neutral-300 shadow-sm outline-none ${inputClassName}`}
        value={text}
        placeholder={placeholder}
        onInput={onInput}
        readOnly={readOnly}
      ></textarea>
    </div>
  );
}

TextArea.defaultProps = {
  type: "text",
  autoComplete: "on",
  readOnly: false,
  onChange: None,
  placeholder: "",
};
