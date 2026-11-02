<script setup lang="ts">
import type { PrintedCoverLetter } from "~/data/cover-letters";
import { computed } from "vue";
import { formatDay } from "~/utils/format";
import { paragraphs } from "~/utils/cover-letter";

// A cover letter: the print page prints it, the desk editor shows it live while
// writing. The print page owns the @page rule, so this never affects the desk.
const { letter } = defineProps<{ letter: PrintedCoverLetter }>();

const body = computed(() => paragraphs(letter.body));
</script>

<template>
  <article class="letter cv-paper" :lang="letter.language">
    <CvHead :profile="letter.profile" :role="letter.role" />

    <p class="letter__to">
      <strong class="letter__company">{{ letter.company }}</strong>
      <template v-if="letter.recipient">
        <br />
        {{ letter.recipient }}
      </template>
    </p>

    <p v-if="letter.letterDate" class="letter__date">
      {{ formatDay(letter.letterDate, letter.language) }}
    </p>

    <h2 v-if="letter.subject" class="letter__subject">{{ letter.subject }}</h2>

    <p v-if="letter.salutation" class="letter__salutation">{{ letter.salutation }}</p>

    <p v-for="(paragraph, index) in body" :key="index" class="letter__paragraph">
      {{ paragraph }}
    </p>

    <div class="letter__signature">
      <p v-if="letter.closing">{{ letter.closing }}</p>
      <p class="letter__name">{{ letter.profile.name }}</p>
    </div>
  </article>
</template>

<style scoped>
/* Letter text is a step larger than the CV's: 10.5pt, read as running text.
   No positioned text, as in the CV: it would print out of reading order. */
.letter {
  --cv-scale: calc(14 / 13);
}

.letter__to {
  margin-top: 28px;
  white-space: pre-line;
}

.letter__company {
  font-weight: 600;
}

.letter__date {
  margin-top: 16px;
  color: var(--cv-soft);
}

.letter__subject {
  margin-top: 24px;
  font-family: inherit;
  font-size: calc(15px * var(--cv-scale));
  font-weight: 600;
  line-height: 1.35;
  color: inherit;
  break-after: avoid;
}

.letter__salutation {
  margin-top: 16px;
}

.letter__paragraph {
  margin-top: 10px;
  white-space: pre-line;
  text-wrap: pretty;
}

.letter__signature {
  margin-top: 20px;
  break-inside: avoid;
}

.letter__name {
  margin-top: 10px;
  font-weight: 500;
}
</style>
