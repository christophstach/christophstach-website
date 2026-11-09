import { Show, createMemo, snapshot } from "solid-js";
import { DeskFormSection } from "../../../../components/desk/DeskFormSection";
import { DeskLinkRows } from "../../../../components/desk/DeskLinkRows";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { Profile } from "../../../../data/cv";
import type { RouteDefinition } from "@solidjs/router";
import { forgetPageChecks } from "../../../../lib/desk/page-checks";
import { getDeskProfile } from "../../../../lib/desk/queries";
import { paths } from "../../../../router";
import { saveDeskProfile } from "../../../../lib/desk/content";
import styles from "../../../../components/desk/page-cv-profile.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

/** The form's state: a copy, so editing never touches the fetched profile. */
function toForm(profile: Profile): Profile {
  return { ...profile, links: profile.links.map((link) => ({ ...link })) };
}

const EMPTY_PROFILE: Profile = {
  name: "",
  role: "",
  location: "",
  email: "",
  phone: "",
  links: [],
};

type TextKey = "name" | "role" | "location" | "email" | "phone";

export default function ProfilePage() {
  const stored = createMemo(() => getDeskProfile());
  const { form, setForm, dirty, reset } = useDraft(() => toForm(stored()), EMPTY_PROFILE);
  const request = useDeskRequest();

  const bind = (key: TextKey) => ({
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();

    if (await request.run(() => saveDeskProfile(snapshot(form)))) {
      forgetPageChecks();
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title="Profile · CV · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.cv()}>~/desk/cv</a> / profile
          </p>
          <h1 class="desk-head__title">Profile</h1>
          <p class="desk-head__sub">The header every variant's PDF prints.</p>
        </div>
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection title="identity" description="The name on top of the CV.">
          <label class="field">
            <span class="field__label">name</span>
            <input {...bind("name")} class="input" required />
          </label>
          <label class="field">
            <span class="field__label">role</span>
            <input {...bind("role")} class="input" />
            <span class="field__hint">Not printed: each variant has its own role line.</span>
          </label>
        </DeskFormSection>

        <DeskFormSection title="contact" description="Printed in one line under the role.">
          <label class="field">
            <span class="field__label">location</span>
            <input {...bind("location")} class="input" />
          </label>
          <label class="field">
            <span class="field__label">email</span>
            <input {...bind("email")} class="input" type="email" />
          </label>
          <label class="field">
            <span class="field__label">phone</span>
            <input {...bind("phone")} class="input" type="tel" />
          </label>
        </DeskFormSection>

        <DeskFormSection
          title="links"
          description="Printed without https:// next to the contact line."
          single
        >
          <DeskLinkRows
            links={form.links}
            labelPlaceholder="GitHub"
            hrefPlaceholder="https://…"
            hrefType="url"
            addClass={styles["add-button"]}
            onChange={(index, key, value) => {
              setForm((draft) => {
                const link = draft.links[index];

                if (link !== undefined) {
                  link[key] = value;
                }
              });
            }}
            onAdd={() => {
              setForm((draft) => {
                draft.links.push({ label: "", href: "" });
              });
            }}
            onRemove={(index) => {
              setForm((draft) => {
                draft.links.splice(index, 1);
              });
            }}
          />
        </DeskFormSection>
      </div>

      <Show when={dirty()}>
        <DeskSaveBar busy={request.busy()} error={request.error()} onDiscard={reset} />
      </Show>
    </form>
  );
}

export const route = {
  preload: () => {
    void getDeskProfile();
  },
} satisfies RouteDefinition;
