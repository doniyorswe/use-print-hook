import { forwardRef, type ElementType, type ForwardedRef, type ReactNode } from 'react';
import { NO_PRINT_CLASS, PAGE_BREAK_CLASS, PRINT_ONLY_CLASS } from '../constants';
import { usePrintMode } from '../context/print-mode';
import type { PolymorphicComponent, PolymorphicProps } from '../utils/polymorphic';
import { cx } from '../utils/refs';

interface ChildrenProps {
  children?: ReactNode;
}

type Props = PolymorphicProps<ElementType, ChildrenProps>;

/** Visible only in the print output. Hidden on screen with an inline `display: none`. */
export const PrintOnly = forwardRef(function PrintOnly(
  { as, className, style, ...rest }: Props,
  ref: ForwardedRef<HTMLElement>,
) {
  const Comp: ElementType = as ?? 'div';
  const inPrint = usePrintMode();
  return (
    <Comp
      ref={ref}
      className={cx(PRINT_ONLY_CLASS, className)}
      style={inPrint ? style : { ...style, display: 'none' }}
      {...rest}
    />
  );
}) as PolymorphicComponent<'div', ChildrenProps>;
PrintOnly.displayName = 'PrintOnly';

/** Visible only on screen. Not rendered in print mode, hidden by CSS in cloned output. */
export const NoPrint = forwardRef(function NoPrint(
  { as, className, ...rest }: Props,
  ref: ForwardedRef<HTMLElement>,
) {
  const Comp: ElementType = as ?? 'div';
  if (usePrintMode()) return null;
  return <Comp ref={ref} className={cx(NO_PRINT_CLASS, className)} {...rest} />;
}) as PolymorphicComponent<'div', ChildrenProps>;
NoPrint.displayName = 'NoPrint';

/** Forces a page break after itself. */
export const PageBreak = forwardRef(function PageBreak(
  { as, className, style, ...rest }: Props,
  ref: ForwardedRef<HTMLElement>,
) {
  const Comp: ElementType = as ?? 'div';
  return (
    <Comp
      ref={ref}
      aria-hidden
      className={cx(PAGE_BREAK_CLASS, className)}
      style={{ breakAfter: 'page', ...style }}
      {...rest}
    />
  );
}) as PolymorphicComponent<'div', ChildrenProps>;
PageBreak.displayName = 'PageBreak';
