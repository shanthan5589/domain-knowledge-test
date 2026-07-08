import Image from 'next/image'

// Site logo shown in nav headers, in place of the old "Domain Knowledge Test" text.
export default function Logo() {
  return (
    <Image
      src="/logo.jpg"
      alt="Edu by Castor AI"
      width={140}
      height={69}
      className="h-12 w-auto"
      priority
    />
  )
}
