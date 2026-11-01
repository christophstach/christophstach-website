<script setup lang="ts">
import { computed, ref } from "vue";
import { createError, refreshNuxtData, useFetch, useSeoMeta } from "nuxt/app";
import type { Profile } from "~/data/cv";
import { useDeskRequest } from "~/utils/desk-request";
import { usePageChecks } from "~/utils/desk-page-checks";
import { useUnsavedGuard } from "~/utils/desk-unsaved";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Profile · CV · Desk",
  robots: "noindex, nofollow",
});

const { data: stored } = await useFetch("/api/desk/profile", { key: "desk-profile" });

if (!stored.value) {
  throw createError({ statusCode: 500, message: "No CV profile.", fatal: true });
}

/** The form's state: core technologies as one comma-separated line. */
function toForm(profile: Profile) {
  return {
    name: profile.name,
    role: profile.role,
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    coreTechnologies: profile.coreTechnologies.join(", "),
    links: profile.links.map((link) => ({ ...link })),
  };
}

const draft = ref(toForm(stored.value));
const saved = computed(() => (stored.value ? toForm(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));

useUnsavedGuard(() => dirty.value);

function addLink() {
  draft.value.links.push({ label: "", href: "" });
}

function removeLink(index: number) {
  draft.value.links.splice(index, 1);
}

const request = useDeskRequest();
const pageChecks = usePageChecks();

async function save() {
  const body = { ...draft.value, coreTechnologies: draft.value.coreTechnologies.split(",") };

  if (await request.run(() => $fetch<unknown>("/api/desk/profile", { method: "PUT", body }))) {
    await refreshNuxtData(["desk-profile", "desk-cv-variants"]);
    pageChecks.forget();
    draft.value = structuredClone(saved.value);
  }
}

function discard() {
  draft.value = structuredClone(saved.value);
  request.error.value = "";
}
</script>

<template>
  <form class="desk-page" @submit.prevent="save">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path"><NuxtLink to="/desk/cv">~/desk/cv</NuxtLink> / profile</p>
        <h1 class="desk-head__title">Profile</h1>
        <p class="desk-head__sub">The header every variant's PDF prints.</p>
      </div>
    </header>

    <p v-if="request.error.value && !dirty" class="desk-error" role="alert">
      {{ request.error.value }}
    </p>

    <div>
      <DeskFormSection title="identity" description="The name on top of the CV.">
        <label class="field">
          <span class="field__label">name</span>
          <input v-model="draft.name" class="input" required />
        </label>
        <label class="field">
          <span class="field__label">role</span>
          <input v-model="draft.role" class="input" />
          <span class="field__hint">Not printed: each variant has its own role line.</span>
        </label>
      </DeskFormSection>

      <DeskFormSection title="contact" description="Printed in one line under the role.">
        <label class="field">
          <span class="field__label">location</span>
          <input v-model="draft.location" class="input" />
        </label>
        <label class="field">
          <span class="field__label">email</span>
          <input v-model="draft.email" class="input" type="email" />
        </label>
        <label class="field">
          <span class="field__label">phone</span>
          <input v-model="draft.phone" class="input" type="tel" />
        </label>
      </DeskFormSection>

      <DeskFormSection
        title="links"
        description="Printed without https:// next to the contact line."
        single
      >
        <ul v-if="draft.links.length" class="form-rows">
          <li v-for="(link, index) in draft.links" :key="index" class="link-row">
            <input
              v-model="link.label"
              class="input"
              placeholder="GitHub"
              aria-label="Link label"
              required
            />
            <input
              v-model="link.href"
              class="input link-row__href"
              type="url"
              placeholder="https://…"
              aria-label="Link address"
              required
            />
            <button
              type="button"
              class="icon-button"
              aria-label="Remove link"
              title="Remove link"
              @click="removeLink(index)"
            >
              <Icon name="tabler:trash" size="16" />
            </button>
          </li>
        </ul>

        <button type="button" class="button button--outline add-button" @click="addLink">
          <Icon name="tabler:plus" size="16" />
          Add link
        </button>
      </DeskFormSection>

      <DeskFormSection
        title="core technologies"
        description="Your main stack, in display order. Not printed yet."
        single
      >
        <label class="field">
          <span class="field__label">technologies</span>
          <textarea v-model="draft.coreTechnologies" class="input" rows="2" />
          <span class="field__hint">Comma-separated.</span>
        </label>
      </DeskFormSection>
    </div>

    <DeskSaveBar
      v-if="dirty"
      :busy="request.busy.value"
      :error="request.error.value"
      @discard="discard"
    />
  </form>
</template>

<style scoped>
.add-button {
  justify-self: start;
}
</style>
