"use client";

import clsx from "clsx";
import { Link } from "@/components/link";
import ArrowDiagonal from "@/icons/ArrowDiagonal";
import s from "./button.module.css";
import type { ReactNode, CSSProperties } from "react";

interface ButtonProps {
  icon?: ReactNode;
  arrow?: boolean;
  children?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  variant?: "primary" | "outline";
}

export const Button = ({
  icon,
  arrow,
  children,
  href,
  onClick,
  className,
  style,
  variant = "primary",
}: ButtonProps) => {
  const cls = clsx(
    s.button,
    className,
    icon && s["has-icon"],
    variant === "outline" && s.outline
  );

  const inner = (
    <>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.text}>
        <span className={s.visible}>
          {children}{" "}
          {arrow && <ArrowDiagonal className={clsx(s.arrow, "icon")} />}
        </span>
        <span aria-hidden="true" className={s.hidden}>
          {children}{" "}
          {arrow && <ArrowDiagonal className={clsx(s.arrow, "icon")} />}
        </span>
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={cls} style={style}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} style={style} onClick={onClick}>
      {inner}
    </button>
  );
};
