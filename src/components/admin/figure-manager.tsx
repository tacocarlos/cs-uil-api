"use client";

import { useRef, useState } from "react";
import { ImageOff, ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { uploadFiles } from "@/app/api/uploadthing/client";
import { placeholdersIn, type ProblemImage } from "@/lib/problem-images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Reads an image file's pixel size before it is uploaded. */
async function imageSize(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // SVGs and some formats can't be decoded to a bitmap; size is optional.
    return { width: null, height: null };
  }
}

/**
 * Lists the figures a problem's markdown refers to and lets the admin upload,
 * replace, or remove the image behind each placeholder.
 *
 * Images whose placeholder no longer appears in the markdown are listed
 * separately, so they can be removed or kept for when the reference is added
 * back. Nothing is written to the database until the surrounding form saves.
 */
export function FigureManager({
  markdown,
  images,
  onChange,
  disabled,
}: {
  markdown: string;
  images: ProblemImage[];
  /** Receives an updater, since uploads finish after other edits may land */
  onChange: (update: (images: ProblemImage[]) => ProblemImage[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Placeholder the file picker was opened for */
  const target = useRef<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const referenced = placeholdersIn(markdown);
  const byPlaceholder = new Map(images.map((img) => [img.placeholder, img]));
  const unreferenced = images.filter(
    (img) => !referenced.includes(img.placeholder),
  );

  function pick(placeholder: string) {
    target.current = placeholder;
    inputRef.current?.click();
  }

  async function upload(file: File) {
    const placeholder = target.current;
    if (!placeholder) return;

    setUploading(placeholder);
    try {
      const size = await imageSize(file);
      const [result] = await uploadFiles("imageUploader", { files: [file] });
      if (!result) throw new Error("Upload returned no file.");

      onChange((current) => [
        ...current.filter((img) => img.placeholder !== placeholder),
        { placeholder, url: result.ufsUrl, key: result.key, ...size },
      ]);
    } catch (e) {
      toast.error(
        `Could not upload ${placeholder}: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    } finally {
      setUploading(null);
    }
  }

  function remove(placeholder: string) {
    onChange((current) =>
      current.filter((img) => img.placeholder !== placeholder),
    );
  }

  function row(placeholder: string, image: ProblemImage | undefined) {
    const busy = uploading === placeholder;
    return (
      <li
        key={placeholder}
        className="flex items-center gap-3 rounded-xl border border-border/60 p-2"
      >
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={placeholder}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImageOff className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs">{placeholder}</p>
          <p className="text-xs text-muted-foreground">
            {image
              ? image.width && image.height
                ? `${image.width} × ${image.height}`
                : "Uploaded"
              : "No image yet"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading !== null}
          onClick={() => pick(placeholder)}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImageUp className="size-3.5" />
          )}
          {image ? "Replace" : "Upload"}
        </Button>
        {image && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove ${placeholder}`}
            disabled={disabled || uploading !== null}
            onClick={() => remove(placeholder)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Figures</Label>
        <Badge variant="secondary">{referenced.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Reference a figure in the markdown as{" "}
        <code className="font-mono">![Figure 1](uil-cs-api-figure:1)</code>; its image is
        stored separately and filled in when the problem is shown.
      </p>

      {referenced.length > 0 && (
        <ul className="space-y-2">
          {referenced.map((p) => row(p, byPlaceholder.get(p)))}
        </ul>
      )}

      {unreferenced.length > 0 && (
        <>
          <p className="pt-2 text-xs text-muted-foreground">
            Not referenced in the markdown:
          </p>
          <ul className="space-y-2">
            {unreferenced.map((img) => row(img.placeholder, img))}
          </ul>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
