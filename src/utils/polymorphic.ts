import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  ElementType,
  ReactElement,
} from 'react';

/** Own props `P` + `as` + the native props of `C` (own props win). */
export type PolymorphicProps<C extends ElementType, P = object> = P & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof P | 'as'>;

export type PolymorphicRef<C extends ElementType> = ComponentPropsWithRef<C>['ref'];

/** Component whose props and ref follow its `as` prop; `D` is the default element. */
export interface PolymorphicComponent<D extends ElementType, P = object> {
  <C extends ElementType = D>(
    props: PolymorphicProps<C, P> & { ref?: PolymorphicRef<C> },
  ): ReactElement | null;
  displayName?: string;
}
