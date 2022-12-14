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

      await transporter.sendMail({
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
        }
      }
    } catch (error) {
      return { error }
    }
  })

  return (
    <>
      <Title>Christoph Stach - Contact</Title>
      <Form>
        <div class="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <Input type="email" name="email" placeholder="E-Mail" label="E-Mail" />
          <Input type="text" name="subject" placeholder="Subject" label="Subject" />
          <Input type="textarea" name="text" placeholder="Text" label="Text" />

          <div>
            <Button type="submit" disabled={response.pending}>
              <Show when={response.pending} fallback="Send">
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
