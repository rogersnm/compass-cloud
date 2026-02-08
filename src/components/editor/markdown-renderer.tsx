import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return (
      <p className="text-sm text-muted-foreground italic">No content.</p>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
