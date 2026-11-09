import "./assets/css/main.css";
import { Loading } from "solid-js";
import { Router } from "./router";

// @solidjs/meta 1.0 needs no provider: its head registry is ambient.
export default function App() {
  return <Router>{(props) => <Loading>{props.children}</Loading>}</Router>;
}
