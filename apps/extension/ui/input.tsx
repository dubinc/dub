import { cn } from "@dub/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "block overflow-hidden rounded-md border border-gray-300 border-opacity-25 bg-white p-2 px-5 text-black shadow-lg focus:border-black focus:outline-none focus:ring-0 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
