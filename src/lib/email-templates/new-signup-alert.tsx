import * as React from "react";
import { Body, Container, Head, Heading, Html, Img, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import * as s from "./styles";

const Alert = ({ name, email }: { name?: string; email?: string }) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New FutureTalent AI signup</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Img
          src={s.LOGO_URL}
          width="210"
          height="48"
          alt="FutureTalent AI"
          style={{ margin: "0 0 24px" }}
        />
        <Heading style={s.h1}>New registration</Heading>
        <Text style={s.text}>Name: {name || "(not given)"}</Text>
        <Text style={s.text}>Email: {email || "(unknown)"}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Alert,
  subject: "New FutureTalent AI signup",
  displayName: "Owner signup alert",
  to: "alipta.ballav@gmail.com",
  previewData: { name: "Priya", email: "priya@example.com" },
} satisfies TemplateEntry;
