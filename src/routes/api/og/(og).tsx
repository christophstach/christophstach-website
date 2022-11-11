import chrome from 'chrome-aws-lambda'
import puppeteer from 'puppeteer-core'
import { renderToString } from 'solid-js/web'
import { Body, Html } from 'solid-start'

export async function GET2() {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      // channel: 'chrome',
      executablePath: await chrome.executablePath,
      defaultViewport: { width: 1200, height: 630 },
    })

    const page = await browser.newPage()
    //text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2
    const content = (
      <Html>
        <Body style={{ margin: 0 }}>
          <div
            style={{
              'font-family': 'sans-serif',
              gap: '2rem',
              'flex-direction': 'column',
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center',
              height: '100%',
            }}
          >
            <div style={{ 'font-size': '3.75rem', 'font-weight': 800 }}>Hi, I am Christoph!</div>

            <div>
              <img
                style={{ display: 'block', 'border-radius': '100%' }}
                src="https://christophstach-website.vercel.app/hero.webp"
              />
            </div>

            <div
              style={{
                padding: '0.625rem 1.25rem ',
                'font-weight': 500,
                color: '#ffffff',
                'font-size': '0.875rem',
                'line-height': '1.25rem',
                'text-align': 'center',
                'border-radius': '0.5rem',
                'background-color': 'rgb(79,70,229)',
              }}
            >
              Go to my website
            </div>
          </div>
        </Body>
      </Html>
    )

    await page.setContent(renderToString(() => content))

    const image = await page.screenshot()

    return new Response(image)
  } catch (e) {
    console.log(e)
  }

  return new Response('TEst 123')
}
