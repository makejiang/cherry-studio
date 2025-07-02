import { configureStore } from '@reduxjs/toolkit'
import type { Model } from '@renderer/types'
import { WebSearchSource } from '@renderer/types'
import type { MainTextMessageBlock } from '@renderer/types/newMessage'
import { MessageBlockStatus, MessageBlockType } from '@renderer/types/newMessage'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MainTextBlock from '../MainTextBlock'

// Mock dependencies
const mockUseSettings = vi.fn()
const mockUseSelector = vi.fn()

// Mock hooks
vi.mock('@renderer/hooks/useSettings', () => ({
  useSettings: () => mockUseSettings()
}))

vi.mock('react-redux', async () => {
  const actual = await import('react-redux')
  return {
    ...actual,
    useSelector: () => mockUseSelector(),
    useDispatch: () => vi.fn()
  }
})

// Mock store to avoid withTypes issues
vi.mock('@renderer/store', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(() => vi.fn())
}))

// Mock store selectors
vi.mock('@renderer/store/messageBlock', async () => {
  const actual = await import('@renderer/store/messageBlock')
  return {
    ...actual,
    selectFormattedCitationsByBlockId: vi.fn(() => [])
  }
})

// Mock utilities
vi.mock('@renderer/utils/formats', () => ({
  cleanMarkdownContent: vi.fn((content: string) => content),
  encodeHTML: vi.fn((content: string) => content.replace(/"/g, '&quot;'))
}))

// Mock services
vi.mock('@renderer/services/ModelService', () => ({
  getModelUniqId: vi.fn()
}))

// Mock Markdown component
vi.mock('@renderer/pages/home/Markdown/Markdown', () => ({
  __esModule: true,
  default: ({ block }: any) => (
    <div data-testid="mock-markdown" data-content={block.content}>
      Markdown: {block.content}
    </div>
  )
}))

describe('MainTextBlock', () => {
  // Get references to mocked modules
  let mockGetModelUniqId: any
  let mockCleanMarkdownContent: any

  // Create a mock store for Provider
  const mockStore = configureStore({
    reducer: {
      messageBlocks: (state = {}) => state
    }
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get the mocked functions
    const { getModelUniqId } = await import('@renderer/services/ModelService')
    const { cleanMarkdownContent } = await import('@renderer/utils/formats')
    mockGetModelUniqId = getModelUniqId as any
    mockCleanMarkdownContent = cleanMarkdownContent as any

    // Default mock implementations
    mockUseSettings.mockReturnValue({ renderInputMessageAsMarkdown: false })
    mockUseSelector.mockReturnValue([]) // Empty citations by default
    mockGetModelUniqId.mockImplementation((model: Model) => `${model.id}-${model.name}`)
  })

  // Test data factory functions
  const createMainTextBlock = (overrides: Partial<MainTextMessageBlock> = {}): MainTextMessageBlock => ({
    id: 'test-block-1',
    messageId: 'test-message-1',
    type: MessageBlockType.MAIN_TEXT,
    status: MessageBlockStatus.SUCCESS,
    createdAt: new Date().toISOString(),
    content: 'Test content',
    ...overrides
  })

  const createModel = (overrides: Partial<Model> = {}): Model =>
    ({
      id: 'test-model-1',
      name: 'Test Model',
      provider: 'test-provider',
      ...overrides
    }) as Model

  // Helper functions
  const renderMainTextBlock = (props: {
    block: MainTextMessageBlock
    role: 'user' | 'assistant'
    mentions?: Model[]
    citationBlockId?: string
  }) => {
    return render(
      <Provider store={mockStore}>
        <MainTextBlock {...props} />
      </Provider>
    )
  }

  // User-focused query helpers
  const getRenderedMarkdown = () => screen.queryByTestId('mock-markdown')
  const getRenderedPlainText = () => screen.queryByRole('paragraph')
  const getMentionElements = () => screen.queryAllByText(/@/)

  describe('basic rendering', () => {
    it('should render in markdown mode for assistant messages', () => {
      const block = createMainTextBlock({ content: 'Assistant response' })
      renderMainTextBlock({ block, role: 'assistant' })

      // User should see markdown-rendered content
      expect(getRenderedMarkdown()).toBeInTheDocument()
      expect(screen.getByText('Markdown: Assistant response')).toBeInTheDocument()
      expect(getRenderedPlainText()).not.toBeInTheDocument()
    })

    it('should render in plain text mode for user messages when setting disabled', () => {
      mockUseSettings.mockReturnValue({ renderInputMessageAsMarkdown: false })
      const block = createMainTextBlock({ content: 'User message\nWith line breaks' })
      renderMainTextBlock({ block, role: 'user' })

      // User should see plain text with preserved formatting
      expect(getRenderedPlainText()).toBeInTheDocument()
      expect(getRenderedPlainText()!.textContent).toBe('User message\nWith line breaks')
      expect(getRenderedMarkdown()).not.toBeInTheDocument()

      // Check preserved whitespace
      const textElement = getRenderedPlainText()!
      expect(textElement).toHaveStyle({ whiteSpace: 'pre-wrap' })
    })

    it('should render user messages as markdown when setting enabled', () => {
      mockUseSettings.mockReturnValue({ renderInputMessageAsMarkdown: true })
      const block = createMainTextBlock({ content: 'User **bold** content' })
      renderMainTextBlock({ block, role: 'user' })

      expect(getRenderedMarkdown()).toBeInTheDocument()
      expect(screen.getByText('Markdown: User **bold** content')).toBeInTheDocument()
    })

    it('should preserve complex formatting in plain text mode', () => {
      mockUseSettings.mockReturnValue({ renderInputMessageAsMarkdown: false })
      const complexContent = `Line 1
  Indented line
**Bold not parsed**
- List not parsed`

      const block = createMainTextBlock({ content: complexContent })
      renderMainTextBlock({ block, role: 'user' })

      const textElement = getRenderedPlainText()!
      expect(textElement.textContent).toBe(complexContent)
      expect(textElement).toHaveClass('markdown')
    })

    it('should handle empty content gracefully', () => {
      const block = createMainTextBlock({ content: '' })
      expect(() => {
        renderMainTextBlock({ block, role: 'assistant' })
      }).not.toThrow()

      expect(getRenderedMarkdown()).toBeInTheDocument()
    })
  })

  describe('mentions functionality', () => {
    it('should display model mentions when provided', () => {
      const block = createMainTextBlock({ content: 'Content with mentions' })
      const mentions = [
        createModel({ id: 'model-1', name: 'deepseek-r1' }),
        createModel({ id: 'model-2', name: 'claude-sonnet-4' })
      ]

      renderMainTextBlock({ block, role: 'assistant', mentions })

      // User should see mention tags
      expect(screen.getByText('@deepseek-r1')).toBeInTheDocument()
      expect(screen.getByText('@claude-sonnet-4')).toBeInTheDocument()

      // Service should be called for model processing
      expect(mockGetModelUniqId).toHaveBeenCalledTimes(2)
      expect(mockGetModelUniqId).toHaveBeenCalledWith(mentions[0])
      expect(mockGetModelUniqId).toHaveBeenCalledWith(mentions[1])
    })

    it('should not display mentions when none provided', () => {
      const block = createMainTextBlock({ content: 'No mentions content' })

      renderMainTextBlock({ block, role: 'assistant', mentions: [] })
      expect(getMentionElements()).toHaveLength(0)

      renderMainTextBlock({ block, role: 'assistant', mentions: undefined })
      expect(getMentionElements()).toHaveLength(0)
    })

    it('should style mentions correctly for user visibility', () => {
      const block = createMainTextBlock({ content: 'Styled mentions test' })
      const mentions = [createModel({ id: 'model-1', name: 'Test Model' })]

      renderMainTextBlock({ block, role: 'assistant', mentions })

      const mentionElement = screen.getByText('@Test Model')
      expect(mentionElement).toHaveStyle({ color: 'var(--color-link)' })

      // Check container layout
      const container = mentionElement.closest('[style*="gap"]')
      expect(container).toHaveStyle({
        gap: '8px',
        marginBottom: '10px'
      })
    })
  })

  describe('content processing', () => {
    it('should filter tool_use tags from content', () => {
      const testCases = [
        {
          name: 'single tool_use tag',
          content: 'Before <tool_use>tool content</tool_use> after',
          expectsFiltering: true
        },
        {
          name: 'multiple tool_use tags',
          content: 'Start <tool_use>tool1</tool_use> middle <tool_use>tool2</tool_use> end',
          expectsFiltering: true
        },
        {
          name: 'multiline tool_use',
          content: `Text before
<tool_use>
  multiline
  tool content
</tool_use>
text after`,
          expectsFiltering: true
        },
        {
          name: 'malformed tool_use',
          content: 'Before <tool_use>unclosed tag',
          expectsFiltering: false // Should preserve malformed tags
        }
      ]

      testCases.forEach(({ content, expectsFiltering }) => {
        const block = createMainTextBlock({ content })
        const { unmount } = renderMainTextBlock({ block, role: 'assistant' })

        const renderedContent = getRenderedMarkdown()
        expect(renderedContent).toBeInTheDocument()

        if (expectsFiltering) {
          // Check that tool_use content is not visible to user
          expect(screen.queryByText(/tool content|tool1|tool2|multiline/)).not.toBeInTheDocument()
        }

        unmount()
      })
    })

    it('should process content through format utilities', () => {
      const block = createMainTextBlock({ content: 'Content to process' })
      mockUseSelector.mockReturnValue([{ id: '1', content: 'Citation content', number: 1 }])

      renderMainTextBlock({
        block,
        role: 'assistant',
        citationBlockId: 'test-citations'
      })

      // Verify utility functions are called
      expect(mockCleanMarkdownContent).toHaveBeenCalled()
    })
  })

  describe('citation integration', () => {
    it('should display content normally when no citations are present', () => {
      const block = createMainTextBlock({ content: 'Content without citations' })
      mockUseSelector.mockReturnValue([])

      renderMainTextBlock({ block, role: 'assistant' })

      expect(screen.getByText('Markdown: Content without citations')).toBeInTheDocument()
      expect(mockUseSelector).toHaveBeenCalled()
    })

    it('should integrate with citation system when citations exist', () => {
      const block = createMainTextBlock({
        content: 'Content with citation [1]',
        citationReferences: [{ citationBlockSource: WebSearchSource.OPENAI }]
      })

      const mockCitations = [
        {
          id: '1',
          number: 1,
          url: 'https://example.com',
          title: 'Example Citation',
          content: 'Citation content'
        }
      ]

      mockUseSelector.mockReturnValue(mockCitations)
      renderMainTextBlock({
        block,
        role: 'assistant',
        citationBlockId: 'citation-test'
      })

      // Verify citation integration works
      expect(mockUseSelector).toHaveBeenCalled()
      expect(getRenderedMarkdown()).toBeInTheDocument()

      // Verify content processing occurred
      expect(mockCleanMarkdownContent).toHaveBeenCalledWith('Citation content')
    })

    it('should handle different citation sources correctly', () => {
      const testSources = [WebSearchSource.OPENAI, 'DEFAULT' as any, 'CUSTOM' as any]

      testSources.forEach((source) => {
        const block = createMainTextBlock({
          content: `Citation test for ${source}`,
          citationReferences: [{ citationBlockSource: source }]
        })

        mockUseSelector.mockReturnValue([{ id: '1', number: 1, url: 'https://test.com', title: 'Test' }])

        const { unmount } = renderMainTextBlock({
          block,
          role: 'assistant',
          citationBlockId: `test-${source}`
        })

        expect(getRenderedMarkdown()).toBeInTheDocument()
        unmount()
      })
    })

    it('should handle multiple citations gracefully', () => {
      const block = createMainTextBlock({
        content: 'Multiple citations [1] and [2]',
        citationReferences: [{ citationBlockSource: 'DEFAULT' as any }]
      })

      const multipleCitations = [
        { id: '1', number: 1, url: 'https://first.com', title: 'First' },
        { id: '2', number: 2, url: 'https://second.com', title: 'Second' }
      ]

      mockUseSelector.mockReturnValue(multipleCitations)

      expect(() => {
        renderMainTextBlock({ block, role: 'assistant', citationBlockId: 'multi-test' })
      }).not.toThrow()

      expect(getRenderedMarkdown()).toBeInTheDocument()
    })

    it('should handle Perplexity citations correctly', () => {
      const block = createMainTextBlock({
        content: 'Perplexity citations [<sup>1</sup>](https://example.com)',
        citationReferences: [{ citationBlockId: 'perplexity-test', citationBlockSource: WebSearchSource.PERPLEXITY }]
      })
      const mockCitations = [
        { id: '1', number: 1, url: 'https://example.com', title: 'Example Citation', content: 'Citation content' }
      ]
      mockUseSelector.mockReturnValue(mockCitations)
      renderMainTextBlock({ block, role: 'assistant', citationBlockId: 'perplexity-test' })
      expect(getRenderedMarkdown()).toBeInTheDocument()
    })

    it('should correctly format Perplexity citations with data-citation attribute', () => {
      const originalContent =
        'Conflict and military action [<sup>1</sup>](https://www.takungpao.com/news/232111/2025/0615/1095534.html).'
      const block = createMainTextBlock({
        content: originalContent,
        citationReferences: [{ citationBlockId: 'perplexity-test', citationBlockSource: WebSearchSource.PERPLEXITY }]
      })

      const mockCitations = [
        {
          id: '1',
          number: 1,
          url: 'https://www.takungpao.com/news/232111/2025/0615/1095534.html',
          title: '大公報',
          content:
            '冲突升级与军事行动 以伊军事冲突 2025年6月13日晚至14日，伊朗向以色列发射数百枚弹道导弹，作为对以色列袭击伊朗核设施及军事指挥官的报复。以色列随后对伊朗多地实施空袭，造成超过400名伊朗平民伤亡。伊朗警告可能攻击中东美军基地，并考虑封锁霍尔木兹海峡。中国外交部长王毅在与伊、以外长通话中，谴责以色列攻击伊朗主权，并强调此举可能引发"灾难性后果"。 以色列转向加沙地带 在6月24日以伊停火后，以色列国防军宣布将重点转向加沙地带，旨在解救被扣押人员并终结哈马斯统治。中国国际关系研究院专家秦天指出，此次停火存在脆弱性，因伊核问题未获根本解决，未来以伊冲突可能周期性爆发。'
        }
      ]

      mockUseSelector.mockReturnValue(mockCitations)
      renderMainTextBlock({ block, role: 'assistant', citationBlockId: 'perplexity-test' })

      const markdownElement = screen.getByTestId('mock-markdown')
      const processedContent = markdownElement.getAttribute('data-content')

      // Construct the expected data-citation JSON string (HTML encoded)
      const expectedSupData = {
        id: mockCitations[0].number,
        url: mockCitations[0].url,
        title: mockCitations[0].title,
        content: mockCitations[0].content?.substring(0, 200) // Ensure content is truncated as in the component
      }
      const expectedCitationJson = JSON.stringify(expectedSupData).replace(/"/g, '&quot;')

      // Construct the expected full citation tag
      const expectedFullCitationTag = `[<sup data-citation='${expectedCitationJson}'>${mockCitations[0].number}</sup>](${mockCitations[0].url})`

      expect(processedContent).toContain(expectedFullCitationTag)
    })
  })

  describe('settings integration', () => {
    it('should respond to markdown rendering setting changes', () => {
      const block = createMainTextBlock({ content: 'Settings test content' })

      // Test with markdown enabled
      mockUseSettings.mockReturnValue({ renderInputMessageAsMarkdown: true })
      const { unmount } = renderMainTextBlock({ block, role: 'user' })
      expect(getRenderedMarkdown()).toBeInTheDocument()
      unmount()

      // Test with markdown disabled
      mockUseSettings.mockReturnValue({ renderInputMessageAsMarkdown: false })
      renderMainTextBlock({ block, role: 'user' })
      expect(getRenderedPlainText()).toBeInTheDocument()
      expect(getRenderedMarkdown()).not.toBeInTheDocument()
    })
  })

  describe('edge cases and robustness', () => {
    it('should handle large content without performance issues', () => {
      const largeContent = 'A'.repeat(1000) + ' with citations [1]'
      const block = createMainTextBlock({ content: largeContent })

      const largeCitations = [
        {
          id: '1',
          number: 1,
          url: 'https://large.com',
          title: 'Large',
          content: 'B'.repeat(500)
        }
      ]

      mockUseSelector.mockReturnValue(largeCitations)

      expect(() => {
        renderMainTextBlock({
          block,
          role: 'assistant',
          citationBlockId: 'large-test'
        })
      }).not.toThrow()

      expect(getRenderedMarkdown()).toBeInTheDocument()
    })

    it('should handle special characters and Unicode gracefully', () => {
      const specialContent = '测试内容 🚀 📝 ✨ <>&"\'` [1]'
      const block = createMainTextBlock({ content: specialContent })

      mockUseSelector.mockReturnValue([{ id: '1', number: 1, title: '特殊字符测试', content: '内容 with 🎉' }])

      expect(() => {
        renderMainTextBlock({
          block,
          role: 'assistant',
          citationBlockId: 'unicode-test'
        })
      }).not.toThrow()

      expect(getRenderedMarkdown()).toBeInTheDocument()
    })

    it('should handle null and undefined values gracefully', () => {
      const block = createMainTextBlock({ content: 'Null safety test' })

      expect(() => {
        renderMainTextBlock({
          block,
          role: 'assistant',
          mentions: undefined,
          citationBlockId: undefined
        })
      }).not.toThrow()

      expect(getRenderedMarkdown()).toBeInTheDocument()
    })

    it('should integrate properly with Redux store', () => {
      const block = createMainTextBlock({
        content: 'Redux integration test',
        citationReferences: [{ citationBlockSource: 'DEFAULT' as any }]
      })

      mockUseSelector.mockReturnValue([])
      renderMainTextBlock({ block, role: 'assistant', citationBlockId: 'redux-test' })

      // Verify Redux integration
      expect(mockUseSelector).toHaveBeenCalled()
      expect(getRenderedMarkdown()).toBeInTheDocument()
    })
  })
})
