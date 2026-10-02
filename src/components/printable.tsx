import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import { PRINTABLE_CLASS } from '../constants';
import { PrintModeContext } from '../context/print-mode';
import { registerPrintable, type PrintableEntry } from '../context/registry';
import type { PolymorphicComponent, PolymorphicProps } from '../utils/polymorphic';
import { assignRef, cx } from '../utils/refs';

export interface PrintableOwnProps {
  /** Registers the element so it can be printed with `print({ target: id })`. */
  id?: string;
  children?: ReactNode;
}

export type PrintableProps<C extends ElementType = 'div'> = PolymorphicProps<C, PrintableOwnProps>;

/**
 * Print target. While it is being printed its subtree re-renders with `usePrintMode() === true`
 * before the snapshot, then switches back (a brief re-render may be visible).
 */
function PrintableInner(
  { as, id, className, children, ...rest }: PrintableProps<ElementType>,
  forwarded: ForwardedRef<HTMLElement>,
) {
  const Comp: ElementType = as ?? 'div';
  const parentMode = useContext(PrintModeContext);
  const [printMode, setPrintMode] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const requestedRef = useRef(false);
  const waitersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    waitersRef.current.splice(0).forEach((resolve) => resolve());
  }, [printMode]);

  useEffect(
    () => () => {
      waitersRef.current.splice(0).forEach((resolve) => resolve());
    },
    [],
  );

  const [entry] = useState<PrintableEntry>(() => ({
    getElement: () => elementRef.current,
    setPrintMode: (on) =>
      new Promise<void>((resolve) => {
        if (requestedRef.current === on) return resolve();
        requestedRef.current = on;
        waitersRef.current.push(resolve);
        setPrintMode(on);
      }),
  }));

  useEffect(() => (id ? registerPrintable(id, entry) : undefined), [id, entry]);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      elementRef.current = node;
      assignRef(forwarded, node);
    },
    [forwarded],
  );

  return (
    <PrintModeContext.Provider value={parentMode || printMode}>
      <Comp ref={setRef} data-uph-target={id} className={cx(PRINTABLE_CLASS, className)} {...rest}>
        {children}
      </Comp>
    </PrintModeContext.Provider>
  );
}

export const Printable = forwardRef(PrintableInner) as PolymorphicComponent<
  'div',
  PrintableOwnProps
>;
Printable.displayName = 'Printable';
