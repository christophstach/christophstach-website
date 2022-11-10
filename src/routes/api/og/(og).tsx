import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'experimental-edge',
};

export function GET() {
  return new ImageResponse(<div>TEEEST</div>, { width: 400, height: 300 })
}
