import { definedOrPending, landingConfig } from "./config";
import { Badge, PrimaryAction } from "./Elements";
export default function Plans() {
  return (
    <>
      <div className="plans-grid">
        {landingConfig.plans.map((plan, index) => (
          <article className={`plan-card plan-${index}`} key={plan.name}>
            <Badge>Próximamente</Badge>
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <p className="plan-price">{definedOrPending(plan.price)}</p>
            <dl>
              {[
                ["Créditos", plan.credits],
                ["Duración admitida", plan.admittedDuration],
                ["Correcciones incluidas", plan.includedCorrections],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{definedOrPending(value)}</dd>
                </div>
              ))}
            </dl>
            <PrimaryAction />
          </article>
        ))}
      </div>
      <p className="comparison-note">
        Los planes y pagos aún no están disponibles. Cuando se habiliten, el
        costo se mostrará antes de confirmar una edición.
      </p>
    </>
  );
}
