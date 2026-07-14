import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/** Format raw digits into DD/MM/YYYY while preserving cursor position */
function formatDateInput(raw: string, cursorPos: number): { formatted: string; cursorPos: number } {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let formatted = "";
  let newCursorPos = cursorPos;

  if (digits.length <= 2) {
    formatted = digits;
    newCursorPos = Math.min(cursorPos, formatted.length);
  } else if (digits.length <= 4) {
    formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    // Adjust cursor position if it's after the slash
    if (cursorPos >= 2) {
      newCursorPos = Math.min(cursorPos + 1, formatted.length);
    } else {
      newCursorPos = cursorPos;
    }
  } else {
    formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    // Adjust cursor position for second slash
    if (cursorPos >= 4) {
      newCursorPos = Math.min(cursorPos + 1, formatted.length);
    } else if (cursorPos >= 2) {
      newCursorPos = Math.min(cursorPos + 1, formatted.length);
    } else {
      newCursorPos = cursorPos;
    }
  }

  return { formatted, cursorPos: newCursorPos };
}

export function DateInput({ value, onChange, placeholder = "DD/MM/YYYY", className, id }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const selStart = el.selectionStart ?? 0;
      const prevLen = el.value.length;

      const { formatted, cursorPos } = formatDateInput(el.value, selStart);

      onChange(formatted);

      // Use setTimeout instead of requestAnimationFrame for better cursor stability
      setTimeout(() => {
        if (!inputRef.current) return;
        const finalPos = Math.min(cursorPos, formatted.length);
        inputRef.current.setSelectionRange(finalPos, finalPos);
        inputRef.current.focus();
      }, 0);
    },
    [onChange],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") return;
    const el = e.currentTarget;
    const val = el.value;
    const digits = val.replace(/\D/g, "");
    if (digits.length >= 8 && /\d/.test(e.key)) {
      e.preventDefault();
    }
  }, []);

  const handleFocus = useCallback(() => {
    // Ensure cursor is at the end when focusing
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, []);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder={placeholder}
      maxLength={10}
      className={cn(className)}
    />
  );
}
