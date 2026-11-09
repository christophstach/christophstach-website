import { Meta, Title } from "@solidjs/meta";

/** The head of a desk page: its title, kept out of search. */
export function DeskMeta(props: { title: string }) {
  return (
    <>
      <Title>{`${props.title} · Christoph Stach`}</Title>
      <Meta name="robots" content="noindex, nofollow" />
    </>
  );
}
