// The workplace and salary fields of a desk form, for postings and applications.
import { SALARY_CURRENCIES, WORKPLACES, WORKPLACE_LABELS } from "../../data/postings";
import { For } from "solid-js";
import type { JobTermsForm } from "../../lib/posting";
import styles from "./DeskJobTerms.module.css";

interface DeskJobTermsProps {
  terms: JobTermsForm;
  onChange: (patch: Partial<JobTermsForm>) => void;
}

function DeskJobTerms(props: DeskJobTermsProps) {
  return (
    <>
      <label class="field">
        <span class="field__label">workplace</span>
        {/* `selected` on the options: see the CV select in /desk/cvs. */}
        <select
          class="input"
          onChange={(event) => {
            const { value } = event.currentTarget;

            props.onChange({ workplace: WORKPLACES.find((option) => option === value) ?? "" });
          }}
        >
          <option value="" selected={props.terms.workplace === ""}>
            Not stated
          </option>
          <For each={WORKPLACES}>
            {(workplace) => (
              <option value={workplace} selected={workplace === props.terms.workplace}>
                {WORKPLACE_LABELS[workplace]}
              </option>
            )}
          </For>
        </select>
      </label>
      <div class="field">
        <span class="field__label">salary per year</span>
        <span class={styles.salary}>
          <input
            value={props.terms.salaryMin}
            onInput={(event) => props.onChange({ salaryMin: event.currentTarget.value })}
            class="input"
            type="number"
            min="0"
            step="1000"
            placeholder="from"
            aria-label="salary from"
          />
          <input
            value={props.terms.salaryMax}
            onInput={(event) => props.onChange({ salaryMax: event.currentTarget.value })}
            class="input"
            type="number"
            min="0"
            step="1000"
            placeholder="to"
            aria-label="salary to"
          />
          <select
            class="input"
            aria-label="currency"
            onChange={(event) => {
              const { value } = event.currentTarget;

              props.onChange({
                salaryCurrency: SALARY_CURRENCIES.find((option) => option === value) ?? "",
              });
            }}
          >
            <option value="" selected={props.terms.salaryCurrency === ""}>
              –
            </option>
            <For each={SALARY_CURRENCIES}>
              {(currency) => (
                <option value={currency} selected={currency === props.terms.salaryCurrency}>
                  {currency}
                </option>
              )}
            </For>
          </select>
        </span>
        <span class="field__hint">Whole amounts, e.g. 60000; leave both empty if not stated.</span>
      </div>
    </>
  );
}

export { DeskJobTerms };
