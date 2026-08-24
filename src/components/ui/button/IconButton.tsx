import React, { ReactNode } from "react";

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  title?: string;
  className?: string;
}

const variantClasses = {
  default:
    "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200",
  danger:
    "text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400",
};

const IconButton: React.FC<IconButtonProps> = ({
  children,
  onClick,
  variant = "default",
  disabled = false,
  title,
  className = "",
}) => {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-md transition ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default IconButton;
