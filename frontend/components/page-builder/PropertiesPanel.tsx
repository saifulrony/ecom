'use client'

import React, { useState, useEffect } from 'react'
import { Component } from './types'
import { FiTrash2, FiChevronDown, FiChevronUp, FiCode, FiLayers, FiType, FiDroplet, FiBox, FiSliders } from 'react-icons/fi'

interface PropertiesPanelProps {
  component: Component | null
  onUpdate: (component: Component) => void
  onDelete: (id: string) => void
}

type TabType = 'content' | 'layout' | 'typography' | 'colors' | 'borders' | 'effects' | 'advanced'

export default function PropertiesPanel({ component, onUpdate, onDelete }: PropertiesPanelProps) {
  const [localComponent, setLocalComponent] = useState<Component | null>(component)
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    spacing: true,
    positioning: true,
    display: true,
    dimensions: true,
  })

  useEffect(() => {
    if (component) {
      setLocalComponent(component)
    } else {
      setLocalComponent(null)
    }
  }, [component])

  if (!component || !localComponent) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full flex items-center justify-center">
        <div className="text-center text-gray-400 px-4">
          <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-sm font-medium">Select a component</p>
          <p className="text-xs mt-1">Click any component in the canvas to edit its properties</p>
        </div>
      </div>
    )
  }

  const updateProp = (key: string, value: any) => {
    if (!localComponent) return
    const updated = {
      ...localComponent,
      props: {
        ...(localComponent?.props || {}),
        [key]: value,
      },
    }
    setLocalComponent(updated)
    onUpdate(updated)
  }

  const updateStyle = (key: string, value: any) => {
    if (!localComponent) return
    const updated = {
      ...localComponent,
      style: {
        ...(localComponent?.style || {}),
        [key]: value || undefined,
      },
    }
    setLocalComponent(updated)
    onUpdate(updated)
  }

  const updateContent = (value: string) => {
    if (!localComponent) return
    const updated = {
      ...localComponent,
      content: value,
    }
    setLocalComponent(updated)
    onUpdate(updated)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getStyleValue = (key: string) => {
    return localComponent?.style?.[key as keyof React.CSSProperties] || ''
  }

  // Reusable Input Components
  const InputField = ({ label, value, onChange, type = 'text', placeholder = '', min, max, step }: {
    label: string
    value: any
    onChange: (value: any) => void
    type?: string
    placeholder?: string
    min?: number
    max?: number
    step?: number
  }) => (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
      />
    </div>
  )

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
          placeholder="#000000"
        />
      </div>
    </div>
  )

  const SelectField = ({ label, value, onChange, options }: {
    label: string
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
  }) => (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )

  const SectionHeader = ({ title, isExpanded, onToggle }: { title: string; isExpanded: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-sm sm:text-base font-semibold text-gray-900 hover:text-[#ff6b35] transition-colors"
    >
      <span>{title}</span>
      {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
    </button>
  )

  // Content Tab - Component-specific properties
  const renderContentTab = () => {
    if (!localComponent) return null
    
    switch (component.type) {
      case 'heading':
        return (
          <div className="space-y-3">
            <InputField
              label="Text"
              value={localComponent?.props?.text || localComponent?.content || ''}
              onChange={(val) => {
                updateProp('text', val)
                updateContent(val)
              }}
            />
            <SelectField
              label="Level"
              value={localComponent?.props?.level || 'h1'}
              onChange={(val) => updateProp('level', val)}
              options={[
                { value: 'h1', label: 'H1' },
                { value: 'h2', label: 'H2' },
                { value: 'h3', label: 'H3' },
                { value: 'h4', label: 'H4' },
                { value: 'h5', label: 'H5' },
                { value: 'h6', label: 'H6' },
              ]}
            />
          </div>
        )

      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Text</label>
              <textarea
                value={localComponent?.props?.text || localComponent?.content || ''}
                onChange={(e) => {
                  updateProp('text', e.target.value)
                  updateContent(e.target.value)
                }}
                rows={6}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>
          </div>
        )

      case 'button':
        return (
          <div className="space-y-3">
            <InputField
              label="Text"
              value={localComponent.props?.text || localComponent.content || ''}
              onChange={(val) => {
                updateProp('text', val)
                updateContent(val)
              }}
            />
            <InputField
              label="Link"
              value={localComponent?.props?.link || '#'}
              onChange={(val) => updateProp('link', val)}
              placeholder="/page-url"
            />
            <SelectField
              label="Variant"
              value={localComponent?.props?.variant || 'primary'}
              onChange={(val) => updateProp('variant', val)}
              options={[
                { value: 'primary', label: 'Primary' },
                { value: 'secondary', label: 'Secondary' },
                { value: 'outline', label: 'Outline' },
                { value: 'ghost', label: 'Ghost' },
              ]}
            />
            <SelectField
              label="Size"
              value={localComponent?.props?.size || 'md'}
              onChange={(val) => updateProp('size', val)}
              options={[
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra Large' },
              ]}
            />
          </div>
        )

      case 'image':
        return (
          <div className="space-y-3">
            <InputField
              label="Image URL"
              value={localComponent?.props?.src || ''}
              onChange={(val) => updateProp('src', val)}
              placeholder="https://example.com/image.jpg"
            />
            <InputField
              label="Alt Text"
              value={localComponent?.props?.alt || ''}
              onChange={(val) => updateProp('alt', val)}
            />
            <InputField
              label="Width"
              value={localComponent?.props?.width || '100%'}
              onChange={(val) => updateProp('width', val)}
              placeholder="100% or 800px"
            />
            <InputField
              label="Height"
              value={localComponent?.props?.height || 'auto'}
              onChange={(val) => updateProp('height', val)}
              placeholder="auto or 600px"
            />
          </div>
        )

      case 'section':
        return (
          <div className="space-y-3">
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '40px'}
              onChange={(val) => updateProp('padding', val)}
            />
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.background || '#ffffff'}
              onChange={(val) => updateProp('background', val)}
            />
          </div>
        )

      case 'container':
        return (
          <div className="space-y-3">
            <InputField
              label="Columns"
              value={localComponent?.props?.columns || 2}
              onChange={(val) => updateProp('columns', val)}
              type="number"
              min={1}
              max={12}
            />
            <InputField
              label="Gap"
              value={localComponent?.props?.gap || '20px'}
              onChange={(val) => updateProp('gap', val)}
            />
            <InputField
              label="Padding"
              value={localComponent.props?.padding || '20px'}
              onChange={(val) => updateProp('padding', val)}
            />
          </div>
        )

      case 'products-grid':
      case 'featured-products':
        return (
          <div className="space-y-3">
            <InputField
              label="Number of Products"
              value={localComponent?.props?.limit || 12}
              onChange={(val) => updateProp('limit', val)}
              type="number"
              min={1}
              max={50}
            />
            <InputField
              label="Columns"
              value={localComponent.props?.columns || 4}
              onChange={(val) => updateProp('columns', val)}
              type="number"
              min={1}
              max={6}
            />
          </div>
        )

      default:
        return (
          <div className="text-center text-gray-500 py-8 text-sm">
            <p>No content properties for this component type.</p>
          </div>
        )
    }
  }

  // Layout Tab
  const renderLayoutTab = () => (
    <div className="space-y-4">
      {/* Spacing */}
      <div>
        <SectionHeader
          title="Spacing"
          isExpanded={expandedSections.spacing}
          onToggle={() => toggleSection('spacing')}
        />
        {expandedSections.spacing && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Margin Top" value={getStyleValue('marginTop')} onChange={(v) => updateStyle('marginTop', v)} />
              <InputField label="Margin Right" value={getStyleValue('marginRight')} onChange={(v) => updateStyle('marginRight', v)} />
              <InputField label="Margin Bottom" value={getStyleValue('marginBottom')} onChange={(v) => updateStyle('marginBottom', v)} />
              <InputField label="Margin Left" value={getStyleValue('marginLeft')} onChange={(v) => updateStyle('marginLeft', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Padding Top" value={getStyleValue('paddingTop')} onChange={(v) => updateStyle('paddingTop', v)} />
              <InputField label="Padding Right" value={getStyleValue('paddingRight')} onChange={(v) => updateStyle('paddingRight', v)} />
              <InputField label="Padding Bottom" value={getStyleValue('paddingBottom')} onChange={(v) => updateStyle('paddingBottom', v)} />
              <InputField label="Padding Left" value={getStyleValue('paddingLeft')} onChange={(v) => updateStyle('paddingLeft', v)} />
            </div>
            <InputField label="Margin (shorthand)" value={getStyleValue('margin')} onChange={(v) => updateStyle('margin', v)} placeholder="10px 20px" />
            <InputField label="Padding (shorthand)" value={getStyleValue('padding')} onChange={(v) => updateStyle('padding', v)} placeholder="10px 20px" />
          </div>
        )}
      </div>

      {/* Positioning */}
      <div>
        <SectionHeader
          title="Positioning"
          isExpanded={expandedSections.positioning}
          onToggle={() => toggleSection('positioning')}
        />
        {expandedSections.positioning && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Position"
              value={getStyleValue('position') as string || 'static'}
              onChange={(v) => updateStyle('position', v)}
              options={[
                { value: 'static', label: 'Static' },
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'sticky', label: 'Sticky' },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Top" value={getStyleValue('top')} onChange={(v) => updateStyle('top', v)} />
              <InputField label="Right" value={getStyleValue('right')} onChange={(v) => updateStyle('right', v)} />
              <InputField label="Bottom" value={getStyleValue('bottom')} onChange={(v) => updateStyle('bottom', v)} />
              <InputField label="Left" value={getStyleValue('left')} onChange={(v) => updateStyle('left', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Z-Index" value={getStyleValue('zIndex')} onChange={(v) => updateStyle('zIndex', v)} type="number" />
              <SelectField
                label="Float"
                value={getStyleValue('float') as string || 'none'}
                onChange={(v) => updateStyle('float', v)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Display & Flexbox */}
      <div>
        <SectionHeader
          title="Display & Flexbox"
          isExpanded={expandedSections.display}
          onToggle={() => toggleSection('display')}
        />
        {expandedSections.display && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Display"
              value={getStyleValue('display') as string || 'block'}
              onChange={(v) => updateStyle('display', v)}
              options={[
                { value: 'block', label: 'Block' },
                { value: 'inline', label: 'Inline' },
                { value: 'inline-block', label: 'Inline Block' },
                { value: 'flex', label: 'Flex' },
                { value: 'inline-flex', label: 'Inline Flex' },
                { value: 'grid', label: 'Grid' },
                { value: 'none', label: 'None' },
              ]}
            />
            {(getStyleValue('display') === 'flex' || getStyleValue('display') === 'inline-flex') && (
              <>
                <SelectField
                  label="Flex Direction"
                  value={getStyleValue('flexDirection') as string || 'row'}
                  onChange={(v) => updateStyle('flexDirection', v)}
                  options={[
                    { value: 'row', label: 'Row' },
                    { value: 'column', label: 'Column' },
                    { value: 'row-reverse', label: 'Row Reverse' },
                    { value: 'column-reverse', label: 'Column Reverse' },
                  ]}
                />
                <SelectField
                  label="Justify Content"
                  value={getStyleValue('justifyContent') as string || 'flex-start'}
                  onChange={(v) => updateStyle('justifyContent', v)}
                  options={[
                    { value: 'flex-start', label: 'Flex Start' },
                    { value: 'flex-end', label: 'Flex End' },
                    { value: 'center', label: 'Center' },
                    { value: 'space-between', label: 'Space Between' },
                    { value: 'space-around', label: 'Space Around' },
                    { value: 'space-evenly', label: 'Space Evenly' },
                  ]}
                />
                <SelectField
                  label="Align Items"
                  value={getStyleValue('alignItems') as string || 'stretch'}
                  onChange={(v) => updateStyle('alignItems', v)}
                  options={[
                    { value: 'stretch', label: 'Stretch' },
                    { value: 'flex-start', label: 'Flex Start' },
                    { value: 'flex-end', label: 'Flex End' },
                    { value: 'center', label: 'Center' },
                    { value: 'baseline', label: 'Baseline' },
                  ]}
                />
                <InputField label="Gap" value={getStyleValue('gap')} onChange={(v) => updateStyle('gap', v)} />
                <InputField label="Flex Wrap" value={getStyleValue('flexWrap')} onChange={(v) => updateStyle('flexWrap', v)} placeholder="nowrap, wrap, wrap-reverse" />
              </>
            )}
            {(getStyleValue('display') === 'grid') && (
              <>
                <InputField label="Grid Template Columns" value={getStyleValue('gridTemplateColumns')} onChange={(v) => updateStyle('gridTemplateColumns', v)} placeholder="repeat(3, 1fr)" />
                <InputField label="Grid Template Rows" value={getStyleValue('gridTemplateRows')} onChange={(v) => updateStyle('gridTemplateRows', v)} />
                <InputField label="Grid Gap" value={getStyleValue('gap')} onChange={(v) => updateStyle('gap', v)} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Dimensions */}
      <div>
        <SectionHeader
          title="Dimensions"
          isExpanded={expandedSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
        />
        {expandedSections.dimensions && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Width" value={getStyleValue('width')} onChange={(v) => updateStyle('width', v)} />
              <InputField label="Height" value={getStyleValue('height')} onChange={(v) => updateStyle('height', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Min Width" value={getStyleValue('minWidth')} onChange={(v) => updateStyle('minWidth', v)} />
              <InputField label="Min Height" value={getStyleValue('minHeight')} onChange={(v) => updateStyle('minHeight', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Max Width" value={getStyleValue('maxWidth')} onChange={(v) => updateStyle('maxWidth', v)} />
              <InputField label="Max Height" value={getStyleValue('maxHeight')} onChange={(v) => updateStyle('maxHeight', v)} />
            </div>
            <SelectField
              label="Box Sizing"
              value={getStyleValue('boxSizing') as string || 'content-box'}
              onChange={(v) => updateStyle('boxSizing', v)}
              options={[
                { value: 'content-box', label: 'Content Box' },
                { value: 'border-box', label: 'Border Box' },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  )

  // Typography Tab
  const renderTypographyTab = () => (
    <div className="space-y-4">
      <InputField
        label="Font Family"
        value={getStyleValue('fontFamily')}
        onChange={(v) => updateStyle('fontFamily', v)}
        placeholder="Arial, sans-serif"
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Font Size"
          value={localComponent?.props?.fontSize || getStyleValue('fontSize')}
          onChange={(v) => {
            updateProp('fontSize', v)
            updateStyle('fontSize', v)
          }}
          placeholder="16px, 1rem, 1.2em"
        />
        <InputField
          label="Font Weight"
          value={getStyleValue('fontWeight')}
          onChange={(v) => updateStyle('fontWeight', v)}
          placeholder="400, bold, 700"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Line Height"
          value={getStyleValue('lineHeight')}
          onChange={(v) => updateStyle('lineHeight', v)}
          placeholder="1.5, 24px"
        />
        <InputField
          label="Letter Spacing"
          value={getStyleValue('letterSpacing')}
          onChange={(v) => updateStyle('letterSpacing', v)}
          placeholder="0.5px, 0.1em"
        />
      </div>
      <SelectField
        label="Text Align"
        value={localComponent?.props?.align || (getStyleValue('textAlign') as string) || 'left'}
        onChange={(v) => {
          updateProp('align', v)
          updateStyle('textAlign', v)
        }}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' },
        ]}
      />
      <SelectField
        label="Text Transform"
        value={getStyleValue('textTransform') as string || 'none'}
        onChange={(v) => updateStyle('textTransform', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'uppercase', label: 'Uppercase' },
          { value: 'lowercase', label: 'Lowercase' },
          { value: 'capitalize', label: 'Capitalize' },
        ]}
      />
      <SelectField
        label="Text Decoration"
        value={getStyleValue('textDecoration') as string || 'none'}
        onChange={(v) => updateStyle('textDecoration', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'underline', label: 'Underline' },
          { value: 'overline', label: 'Overline' },
          { value: 'line-through', label: 'Line Through' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Text Indent" value={getStyleValue('textIndent')} onChange={(v) => updateStyle('textIndent', v)} />
        <InputField label="Word Spacing" value={getStyleValue('wordSpacing')} onChange={(v) => updateStyle('wordSpacing', v)} />
      </div>
    </div>
  )

  // Colors Tab
  const renderColorsTab = () => (
    <div className="space-y-4">
      <ColorPicker
        label="Text Color"
        value={localComponent?.props?.color || (getStyleValue('color') as string) || '#000000'}
        onChange={(v) => {
          updateProp('color', v)
          updateStyle('color', v)
        }}
      />
      <ColorPicker
        label="Background Color"
        value={localComponent.props?.background || (getStyleValue('backgroundColor') as string) || '#ffffff'}
        onChange={(v) => {
          updateProp('background', v)
          updateStyle('backgroundColor', v)
        }}
      />
      <InputField
        label="Background Image"
        value={getStyleValue('backgroundImage')}
        onChange={(v) => updateStyle('backgroundImage', v)}
        placeholder="url('image.jpg')"
      />
      <SelectField
        label="Background Size"
        value={getStyleValue('backgroundSize') as string || 'auto'}
        onChange={(v) => updateStyle('backgroundSize', v)}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'cover', label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: '100% 100%', label: '100% 100%' },
        ]}
      />
      <SelectField
        label="Background Position"
        value={getStyleValue('backgroundPosition') as string || 'center'}
        onChange={(v) => updateStyle('backgroundPosition', v)}
        options={[
          { value: 'center', label: 'Center' },
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'top left', label: 'Top Left' },
          { value: 'top right', label: 'Top Right' },
          { value: 'bottom left', label: 'Bottom Left' },
          { value: 'bottom right', label: 'Bottom Right' },
        ]}
      />
      <SelectField
        label="Background Repeat"
        value={getStyleValue('backgroundRepeat') as string || 'no-repeat'}
        onChange={(v) => updateStyle('backgroundRepeat', v)}
        options={[
          { value: 'no-repeat', label: 'No Repeat' },
          { value: 'repeat', label: 'Repeat' },
          { value: 'repeat-x', label: 'Repeat X' },
          { value: 'repeat-y', label: 'Repeat Y' },
        ]}
      />
      <ColorPicker
        label="Opacity"
        value={getStyleValue('opacity') ? `rgba(0,0,0,${getStyleValue('opacity')})` : '#000000'}
        onChange={(v) => {
          // Extract opacity value from rgba or use as is
          const match = v.match(/rgba?\([^)]+,\s*([^)]+)\)/)
          updateStyle('opacity', match ? match[1] : v)
        }}
      />
      <InputField
        label="Opacity (0-1)"
        value={getStyleValue('opacity')}
        onChange={(v) => updateStyle('opacity', v)}
        type="number"
        min={0}
        max={1}
        step={0.1}
        placeholder="1"
      />
    </div>
  )

  // Borders Tab
  const renderBordersTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Border Width" value={getStyleValue('borderWidth')} onChange={(v) => updateStyle('borderWidth', v)} placeholder="1px" />
        <SelectField
          label="Border Style"
          value={getStyleValue('borderStyle') as string || 'solid'}
          onChange={(v) => updateStyle('borderStyle', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'double', label: 'Double' },
          ]}
        />
      </div>
      <ColorPicker
        label="Border Color"
        value={(getStyleValue('borderColor') as string) || '#000000'}
        onChange={(v) => updateStyle('borderColor', v)}
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Border Radius" value={getStyleValue('borderRadius')} onChange={(v) => updateStyle('borderRadius', v)} placeholder="4px" />
        <InputField label="Border Radius (Top Left)" value={getStyleValue('borderTopLeftRadius')} onChange={(v) => updateStyle('borderTopLeftRadius', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Border Radius (Top Right)" value={getStyleValue('borderTopRightRadius')} onChange={(v) => updateStyle('borderTopRightRadius', v)} />
        <InputField label="Border Radius (Bottom Left)" value={getStyleValue('borderBottomLeftRadius')} onChange={(v) => updateStyle('borderBottomLeftRadius', v)} />
      </div>
      <InputField label="Border Radius (Bottom Right)" value={getStyleValue('borderBottomRightRadius')} onChange={(v) => updateStyle('borderBottomRightRadius', v)} />
      
      {/* Shadows */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Shadows</h4>
        <InputField
          label="Box Shadow"
          value={getStyleValue('boxShadow')}
          onChange={(v) => updateStyle('boxShadow', v)}
          placeholder="0 2px 4px rgba(0,0,0,0.1)"
        />
        <InputField
          label="Text Shadow"
          value={getStyleValue('textShadow')}
          onChange={(v) => updateStyle('textShadow', v)}
          placeholder="1px 1px 2px rgba(0,0,0,0.1)"
        />
      </div>
    </div>
  )

  // Effects Tab
  const renderEffectsTab = () => (
    <div className="space-y-4">
      <SelectField
        label="Transform"
        value={getStyleValue('transform') ? 'custom' : 'none'}
        onChange={(v) => updateStyle('transform', v === 'none' ? undefined : v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'scale(1.1)', label: 'Scale Up' },
          { value: 'scale(0.9)', label: 'Scale Down' },
          { value: 'rotate(5deg)', label: 'Rotate Right' },
          { value: 'rotate(-5deg)', label: 'Rotate Left' },
          { value: 'translateX(10px)', label: 'Translate X' },
          { value: 'translateY(10px)', label: 'Translate Y' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {getStyleValue('transform') && (
        <InputField
          label="Custom Transform"
          value={getStyleValue('transform')}
          onChange={(v) => updateStyle('transform', v)}
          placeholder="scale(1.1) rotate(5deg)"
        />
      )}
      <InputField
        label="Transform Origin"
        value={getStyleValue('transformOrigin')}
        onChange={(v) => updateStyle('transformOrigin', v)}
        placeholder="center, top left, 50% 50%"
      />
      <InputField
        label="Transition"
        value={getStyleValue('transition')}
        onChange={(v) => updateStyle('transition', v)}
        placeholder="all 0.3s ease"
      />
      <InputField
        label="Transition Duration"
        value={getStyleValue('transitionDuration')}
        onChange={(v) => updateStyle('transitionDuration', v)}
        placeholder="0.3s"
      />
      <SelectField
        label="Transition Timing"
        value={getStyleValue('transitionTimingFunction') as string || 'ease'}
        onChange={(v) => updateStyle('transitionTimingFunction', v)}
        options={[
          { value: 'ease', label: 'Ease' },
          { value: 'linear', label: 'Linear' },
          { value: 'ease-in', label: 'Ease In' },
          { value: 'ease-out', label: 'Ease Out' },
          { value: 'ease-in-out', label: 'Ease In Out' },
        ]}
      />
      <InputField
        label="Animation"
        value={getStyleValue('animation')}
        onChange={(v) => updateStyle('animation', v)}
        placeholder="fadeIn 1s ease"
      />
      <SelectField
        label="Cursor"
        value={getStyleValue('cursor') as string || 'default'}
        onChange={(v) => updateStyle('cursor', v)}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'pointer', label: 'Pointer' },
          { value: 'text', label: 'Text' },
          { value: 'move', label: 'Move' },
          { value: 'not-allowed', label: 'Not Allowed' },
          { value: 'grab', label: 'Grab' },
        ]}
      />
      <SelectField
        label="Overflow"
        value={getStyleValue('overflow') as string || 'visible'}
        onChange={(v) => updateStyle('overflow', v)}
        options={[
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'scroll', label: 'Scroll' },
          { value: 'auto', label: 'Auto' },
        ]}
      />
      <InputField
        label="Overflow X"
        value={getStyleValue('overflowX')}
        onChange={(v) => updateStyle('overflowX', v)}
        placeholder="hidden, scroll, auto"
      />
      <InputField
        label="Overflow Y"
        value={getStyleValue('overflowY')}
        onChange={(v) => updateStyle('overflowY', v)}
        placeholder="hidden, scroll, auto"
      />
    </div>
  )

  // Advanced Tab - Custom CSS
  const renderAdvancedTab = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Custom CSS Class</label>
          <input
            type="text"
            value={localComponent?.className || ''}
            onChange={(e) => {
              const updated = { ...localComponent, className: e.target.value }
              setLocalComponent(updated)
              onUpdate(updated)
            }}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            placeholder="my-custom-class"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Inline Styles (JSON)</label>
          <textarea
            value={JSON.stringify(localComponent?.style || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                const updated = { ...localComponent, style: parsed }
                setLocalComponent(updated)
                onUpdate(updated)
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            rows={12}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base font-mono border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            placeholder='{"margin": "10px", "padding": "20px"}'
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5">Edit as JSON object</p>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'content', label: 'Content', icon: FiType },
    { id: 'layout', label: 'Layout', icon: FiLayers },
    { id: 'typography', label: 'Typography', icon: FiType },
    { id: 'colors', label: 'Colors', icon: FiDroplet },
    { id: 'borders', label: 'Borders', icon: FiBox },
    { id: 'effects', label: 'Effects', icon: FiSliders },
    { id: 'advanced', label: 'Advanced', icon: FiCode },
  ]

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Properties</h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1 capitalize">{component.type}</p>
          </div>
          <button
            onClick={() => onDelete(component.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete Component"
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex overflow-x-auto bg-gray-50">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center space-x-1.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#ff6b35] text-[#ff6b35] bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'layout' && renderLayoutTab()}
        {activeTab === 'typography' && renderTypographyTab()}
        {activeTab === 'colors' && renderColorsTab()}
        {activeTab === 'borders' && renderBordersTab()}
        {activeTab === 'effects' && renderEffectsTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
      </div>
    </div>
  )
}
