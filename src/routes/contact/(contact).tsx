import nodemailer from "nodemailer"
import { Show } from "solid-js"
import { Title } from "solid-start"
import { createServerAction$ } from "solid-start/server"
import Alert from "../../components/Alert"
import Button from "../../components/Button"
import Input from "../../components/Input"

export default function Contact() {
  const [response, { Form }] = createServerAction$(async (formData: FormData) => {
    const email = formData.get("email") as string
    const subject = formData.get("subject") as string
    const text = formData.get("text") as string

    try {
      const transporter = nodemailer.createTransport({
        host: import.meta.env.VITE_SMTP_HOST,
        port: import.meta.env.VITE_SMTP_PORT,
        requireTLS: true,
        auth: {
          user: import.meta.env.VITE_SMTP_USERNAME,
          pass: import.meta.env.VITE_SMTP_PASSWORD,
        },
      })

      const smtpInfo = await transporter.sendMail({
        from: import.meta.env.VITE_SMTP_SENDER,
        to: import.meta.env.VITE_SMTP_RECIPIENT,
        subject: "E-Mail from Contact form",
        text: `
          E-Mail:\n
          ${email}\n
          Subject:\n 
          ${subject}\n 
          \n
          Text:\n
          ${text}
        `,
      })

      return {
        data: {
          email,
          subject,
          text,
        },
        smtpInfo,
      }
    } catch (error) {
      return { error }
    }
  })

  return (
    <>
      <Title>Christoph Stach - Contact</Title>
      <Form>
        <div class="flex flex-col gap-5 overflow-hidden rounded-md p-5 shadow">
          <Input type="email" name="email" placeholder="E-Mail" label="E-Mail" />
          <Input type="text" name="subject" placeholder="Subject" label="Subject" />
          <Input type="textarea" name="text" placeholder="Text" label="Text" />

          <div>
            <Button type="submit" disabled={response.pending}>
              <Show when={response.pending} fallback="Submit">
                Sending...
              </Show>
            </Button>
          </div>

          <Show when={response.result}>
            <Alert>E-Mail successfully sent!</Alert>
          </Show>
        </div>
      </Form>
    </>
  )
}
