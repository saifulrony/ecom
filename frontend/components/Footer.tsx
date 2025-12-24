import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] border-t border-gray-800 text-gray-400">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-[#ff6b35] transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#ff6b35] transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-[#ff6b35] transition">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/shipping" className="hover:text-[#ff6b35] transition">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-[#ff6b35] transition">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#ff6b35] transition">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="hover:text-[#ff6b35] transition">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[#ff6b35] transition">
                  Order History
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#ff6b35] transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
            <p className="mb-2">Questions?</p>
            <p className="text-[#ff6b35] font-semibold mb-4">1-888-123-456</p>
            <p className="text-sm">Need assistance? We're here to help.</p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Porto eCommerce. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
