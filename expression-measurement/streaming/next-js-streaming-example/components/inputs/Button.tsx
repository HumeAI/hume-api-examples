import { cn } from "../../lib/utilities/styleUtilities";
import { cva } from "class-variance-authority";

type ButtonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "primary" | "secondary";
  text: string;
  onClick: () => void;
  tooltip?: string
};

export function Button({ className, variant, text, onClick, tooltip }: ButtonProps) {
  const styles = cva(
    "cursor-pointer rounded-md bg-neutral-700 py-2 px-3 text-neutral-100 shadow duration-200 hover:bg-neutral-800 hover:ease-linear",
    {
      variants: {
        variant: {
          primary: "bg-neutral-700",
          secondary: "bg-neutral-500",
        },
      },
      defaultVariants: {
        variant: "primary",
      },
    }
  );

  return (
    <div className={cn(styles({ variant }), className)} onClick={() => onClick()} title={tooltip}>
      <div className="text-md font-medium">{text}</div>
    </div>
  );
}
