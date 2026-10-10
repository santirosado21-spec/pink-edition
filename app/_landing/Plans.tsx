import { definedOrPending as pending, landingConfig } from "./config";
import { PrimaryAction } from "./Elements";

export default function Plans() {
  return (
    <div className="plans">
      {landingConfig.plans.map((plan, index) => (
        <article key={plan.name} className={`plan${index === 1 ? " pick" : ""}`}>
          <h3>{plan.name}</h3>
          <p className="plan-for">{plan.description}</p>
          <p className="plan-price">{plan.price ?? "Precio por definir"}</p>
          <dl>
            <div><dt>Créditos</dt><dd>{pending(plan.credits)}</dd></div>
            <div><dt>Duración admitida</dt><dd>{pending(plan.admittedDuration)}</dd></div>
            <div><dt>Correcciones incluidas</dt><dd>{pending(plan.includedCorrections)}</dd></div>
          </dl>
          <PrimaryAction light={index !== 1} />
        </article>
      ))}
    </div>
  );
}
