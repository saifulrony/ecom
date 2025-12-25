import { Component } from './types'

// Generate a unique ID for components
const generateId = () => `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function getDefaultHomePageComponents(): Component[] {
  return [
    {
      id: generateId(),
      type: 'banner',
      props: {
        title: '50% OFF',
        subtitle: 'Spring / Summer Season - STARTING AT ৳1,999',
        height: '400px',
        gradient: 'gradient-dark',
      },
    },
    {
      id: generateId(),
      type: 'section',
      props: {
        padding: '64px 0',
        background: '#f5f5f5',
        align: 'left',
      },
      children: [
        {
          id: generateId(),
          type: 'heading',
          props: {
            text: 'Featured Products',
            level: 'h2',
            align: 'center',
            fontSize: '2.5rem',
            fontWeight: 'bold',
          },
          content: 'Featured Products',
        },
        {
          id: generateId(),
          type: 'products-grid',
          props: {
            limit: 12,
            columns: 4,
          },
        },
      ],
    },
    {
      id: generateId(),
      type: 'section',
      props: {
        padding: '64px 0',
        background: '#ffffff',
        align: 'center',
      },
      children: [
        {
          id: generateId(),
          type: 'grid',
          props: {
            columns: 4,
            gap: '32px',
            template: 'custom',
          },
          children: [
            {
              id: generateId(),
              type: 'card',
              props: {
                title: 'FREE SHIPPING',
                content: 'Orders Over ৳2,000',
                align: 'center',
                radius: '12px',
                shadow: 'md',
              },
            },
            {
              id: generateId(),
              type: 'card',
              props: {
                title: '24/7 SUPPORT',
                content: "We're here to help",
                align: 'center',
                radius: '12px',
                shadow: 'md',
              },
            },
            {
              id: generateId(),
              type: 'card',
              props: {
                title: 'SECURED PAYMENT',
                content: 'Safe & Fast',
                align: 'center',
                radius: '12px',
                shadow: 'md',
              },
            },
            {
              id: generateId(),
              type: 'card',
              props: {
                title: 'FREE RETURNS',
                content: 'Easy & Free',
                align: 'center',
                radius: '12px',
                shadow: 'md',
              },
            },
          ],
        },
      ],
    },
  ]
}

export function getDefaultCartPageComponents(): Component[] {
  return [
    {
      id: generateId(),
      type: 'section',
      props: {
        padding: '40px 0',
        background: '#ffffff',
      },
      children: [
        {
          id: generateId(),
          type: 'heading',
          props: {
            text: 'Shopping Cart',
            level: 'h1',
            align: 'center',
            fontSize: '2.5rem',
          },
          content: 'Shopping Cart',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Your cart items will appear here',
            align: 'center',
          },
          content: 'Your cart items will appear here',
        },
      ],
    },
  ]
}

export function getDefaultCheckoutPageComponents(): Component[] {
  return [
    {
      id: generateId(),
      type: 'section',
      props: {
        padding: '40px 0',
        background: '#ffffff',
      },
      children: [
        {
          id: generateId(),
          type: 'heading',
          props: {
            text: 'Checkout',
            level: 'h1',
            align: 'center',
            fontSize: '2.5rem',
          },
          content: 'Checkout',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Complete your order',
            align: 'center',
          },
          content: 'Complete your order',
        },
      ],
    },
  ]
}

export function getDefaultProductPageComponents(): Component[] {
  return [
    {
      id: generateId(),
      type: 'section',
      props: {
        padding: '40px 0',
        background: '#ffffff',
      },
      children: [
        {
          id: generateId(),
          type: 'heading',
          props: {
            text: 'Product Details',
            level: 'h1',
            align: 'center',
            fontSize: '2.5rem',
          },
          content: 'Product Details',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Product information will appear here',
            align: 'center',
          },
          content: 'Product information will appear here',
        },
      ],
    },
  ]
}

export function getDefaultPageComponents(pageId: string): Component[] {
  switch (pageId) {
    case 'home':
      return getDefaultHomePageComponents()
    case 'cart':
      return getDefaultCartPageComponents()
    case 'checkout':
      return getDefaultCheckoutPageComponents()
    case 'product':
      return getDefaultProductPageComponents()
    default:
      return []
  }
}

