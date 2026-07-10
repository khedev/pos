import React, { createContext, useContext, useRef } from 'react';
import { cn } from '@/lib/utils';

/*
 * Responsive table:
 * - Desktop/tablet: normal table.
 * - Mobile (<=767px): rows become stacked cards. Each <td> shows its column
 *   label (from the matching <th>) via `data-label`, styled in index.css (.table-card).
 * The matching is done by index: heads register their labels during render
 * (before the body renders) and body cells read them in order.
 */
const TableCtx = createContext(null);

const Table = React.forwardRef(({ className, responsive = true, ...props }, ref) => {
  const labelsRef = useRef([]);
  const cellRef = useRef(0);
  // Reset label collection each render so re-renders don't duplicate
  labelsRef.current = [];
  cellRef.current = 0;

  const ctx = {
    responsive,
    registerHead: (label) => { if (label != null) labelsRef.current.push(label); },
    resetRow: () => { cellRef.current = 0; },
    getLabel: () => {
      const l = labelsRef.current[cellRef.current];
      cellRef.current += 1;
      return l;
    },
  };

  return (
    <TableCtx.Provider value={ctx}>
      <div className="relative w-full">
        <table
          ref={ref}
          className={cn(
            'w-full caption-bottom text-sm',
            responsive && 'table-card',
            className
          )}
          {...props}
        />
      </div>
    </TableCtx.Provider>
  );
});
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef(({ className, ...props }, ref) => {
  const ctx = useContext(TableCtx);
  if (ctx?.responsive) ctx.resetRow();
  return (
    <tr
      ref={ref}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
});
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, children, label, ...props }, ref) => {
  const ctx = useContext(TableCtx);
  if (ctx?.responsive) ctx.registerHead(label ?? (typeof children === 'string' ? children : null));
  return (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    >
      {children ?? label}
    </th>
  );
});
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className, children, label, ...props }, ref) => {
  const ctx = useContext(TableCtx);
  const dataLabel = label ?? (ctx?.responsive ? ctx.getLabel() : undefined);
  return (
    <td
      ref={ref}
      data-label={dataLabel}
      className={cn(
        'p-4 align-middle [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
});
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
