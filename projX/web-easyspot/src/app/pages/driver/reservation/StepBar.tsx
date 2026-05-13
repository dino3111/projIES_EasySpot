import { STEPS, type ReservationStep } from './reservationHelpers';

export function StepBar({ current }: Readonly<{ current: ReservationStep }>) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <ol className="flex items-center min-w-max gap-0" aria-label="Passos da reserva">
        {STEPS.map((s, idx) => {
          const done    = current > s.id;
          const active  = current === s.id;
          const pending = current < s.id;
          return (
            <li key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm
                    ${done    ? 'bg-primary border-primary text-primary-content' : ''}
                    ${active  ? 'bg-primary border-primary text-primary-content shadow-lg shadow-primary/30 ring-4 ring-primary/20' : ''}
                    ${pending ? 'bg-base-200 border-base-300 text-base-content/40' : ''}
                  `}
                  aria-current={active ? 'step' : undefined}
                >
                  {done
                    ? <i className="fa-solid fa-check text-xs" />
                    : <i className={`${s.icon} text-xs`} />
                  }
                </div>
                <span className={`text-xs font-medium whitespace-nowrap px-1
                  ${active  ? 'text-primary' : ''}
                  ${done    ? 'text-primary/70' : ''}
                  ${pending ? 'text-base-content/40' : ''}
                `}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 md:w-20 h-0.5 mx-1 mt-[-14px] transition-all duration-500
                  ${current > s.id ? 'bg-primary' : 'bg-base-300'}
                `} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
