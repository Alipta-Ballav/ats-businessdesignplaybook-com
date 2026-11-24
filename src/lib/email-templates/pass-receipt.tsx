import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import * as s from './styles'

interface Props { name?: string; renewal?: boolean; amount?: string; scans?: number; expires?: string; paymentId?: string }

const Receipt = ({ name, renewal, amount = '₹99', scans = 5, expires, paymentId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${renewal ? 'Your pass is renewed' : 'Your Job Hunt Pass is active'} · ${scans} scans added`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Text style={s.brand}>FutureTalent AI</Text>
        <Text style={s.sub}>An initiative by Design shots</Text>
        <Heading style={s.h1}>{renewal ? 'Your pass is renewed' : 'Your Job Hunt Pass is active'}</Heading>
        <Text style={s.text}>{name ? `Hi ${name}, thanks` : 'Thanks'} for your payment. Here are the details:</Text>
        <Section style={s.box}>
          <Text style={s.row}>Amount paid: <b>{amount}</b></Text>
          <Text style={s.row}>Verified scans added: <b>{scans}</b></Text>
          {expires && <Text style={s.row}>Pass valid until: <b>{expires}</b></Text>}
          {paymentId && <Text style={s.row}>Payment ID: {paymentId}</Text>}
        </Section>
        <Text style={s.text}>Use your scans for new resumes or to rescore edited ones. Word downloads are included while your pass is active.</Text>
        <Button href={`${s.SITE}/pass`} style={s.button}>View my pass</Button>
        <Text style={s.foot}>You're receiving this receipt because you paid for a FutureTalent AI pass.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Receipt,
  subject: (d: Record<string, any>) => d['renewal'] ? 'Your FutureTalent AI pass is renewed' : 'Your FutureTalent AI Job Hunt Pass is active',
  displayName: 'Pass receipt',
  previewData: { name: 'Priya', renewal: false, amount: '₹99', scans: 5, expires: '24 Dec 2026', paymentId: 'pay_ABC123' },
} satisfies TemplateEntry
