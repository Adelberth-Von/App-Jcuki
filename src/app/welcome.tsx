import { Redirect } from "expo-router";
/** Keep old profile links working while the account page owns profile editing. */
export default function Welcome() {
  return <Redirect href="/account" />;
}
