import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import * as s from './styles'

const Welcome = ({ name }: { name?: string }) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your free design resume scan is ready</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>FutureTalent AI</Text>
        <Text style={s.sub}>An initiative by Design shots</Text>
        <Heading style={s.h1}>{name ? `Welcome, ${name}!` : 'Welcome aboard!'}</Heading>
        <Text style={s.text}>Your account is ready. Upload your resume to see your score across 8 design dimensions, with every point backed by a quote from your own resume.</Text>
        <Text style={s.text}>Your first scan and AI bullet suggestions are free.</Text>
        <Button href={`${s.SITE}/candidate`} style={s.button}>Check my resume</Button>
        <Text style={s.foot}>You're receiving this because you created a FutureTalent AI account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Welcome,
  subject: 'Welcome to FutureTalent AI',
  displayName: 'Welcome',
  previewData: { name: 'Priya' },
} satisfies TemplateEntry
