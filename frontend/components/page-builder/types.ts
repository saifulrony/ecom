export type ComponentType =
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'section'
  | 'container'
  | 'spacer'
  | 'divider'
  | 'card'
  | 'grid'
  | 'column'
  | 'video'
  | 'form'
  | 'products-grid'
  | 'featured-products'
  | 'product-search'
  | 'contact-form'
  | 'newsletter'
  | 'slider'
  | 'banner'
  | 'testimonials'
  | 'faq'
  | 'code-block'
  | 'alert'
  | 'social-icons'

export interface Component {
  id: string
  type: ComponentType
  content?: string
  props: Record<string, any>
  children?: Component[]
  style?: React.CSSProperties
  className?: string
}

export interface Page {
  id?: number
  page_id: string
  title: string
  description?: string
  components: Component[]
  is_published?: boolean
}

