import { XCircle as CloseIcon } from "@phosphor-icons/react";
import { KeyboardEvent } from "react";

type TextBoxProps = {
  className?: string;
  inputClassName?: string;
  text: string;
  placeholder: string;
  onChange: (text: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  autoComplete: string;
  type: string;
};

export function TextBox({
  className,
  inputClassName,
  text,
  placeholder,
  onChange,
  onKeyDown,
  autoComplete,
  type,
}: TextBoxProps) {
  className = className || "";
  inputClassName = inputClassName || "";

  function handleKeyDown(event: KeyboardEvent) {
    if (onKeyDown) {
      onKeyDown(event);
    }
  }

  return (
    <div
      className={`flex w-full items-center justify-between rounded-md border border-neutral-300 shadow duration-200 hover:ease-linear sm:w-80 ${className}`}
    >
      <input
        className={`text-md w-full bg-transparent p-3 font-medium placeholder-neutral-300 outline-none ${inputClassName}`}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        value={text}
        autoComplete={autoComplete}
      />
      {text && (
        <CloseIcon
          size={26}
          className="mr-3 text-neutral-600 duration-200 hover:cursor-pointer hover:text-neutral-800 hover:ease-linear"
          onClick={() => onChange("")}
        />
      )}
    </div>
  );
}

TextBox.defaultProps = {
  type: "text",
  autoComplete: "on",
};
