"use client";

import type { FooterColumn } from "@/types/site-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface FooterColumnsEditorProps {
  columns: FooterColumn[];
  onChange: (columns: FooterColumn[]) => void;
}

/** Editor các cột link ở footer: thêm/xóa/sửa cột (heading) và links (label + href) trong từng cột. */
export default function FooterColumnsEditor({ columns, onChange }: FooterColumnsEditorProps) {
  function updateColumn(idx: number, col: FooterColumn) {
    const next = [...columns];
    next[idx] = col;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Tiêu đề cột (VD: Về chúng tôi)"
              value={col.heading}
              onChange={(e) => updateColumn(colIdx, { ...col, heading: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Xóa cột"
              onClick={() => onChange(columns.filter((_, i) => i !== colIdx))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 pl-2 border-l-2">
            {col.links.map((link, linkIdx) => (
              <div key={linkIdx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <Input
                  placeholder="Nhãn (VD: Giới thiệu)"
                  value={link.label}
                  onChange={(e) => {
                    const links = [...col.links];
                    links[linkIdx] = { ...link, label: e.target.value };
                    updateColumn(colIdx, { ...col, links });
                  }}
                />
                <Input
                  placeholder="/duong-dan"
                  value={link.href}
                  onChange={(e) => {
                    const links = [...col.links];
                    links[linkIdx] = { ...link, href: e.target.value };
                    updateColumn(colIdx, { ...col, links });
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateColumn(colIdx, { ...col, links: col.links.filter((_, i) => i !== linkIdx) })}
                >
                  Xóa
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateColumn(colIdx, { ...col, links: [...col.links, { label: "", href: "/" }] })}
            >
              + Thêm link
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={() => onChange([...columns, { heading: "Cột mới", links: [] }])}>
        + Thêm cột
      </Button>
      {columns.length === 0 && (
        <Label className="block text-xs font-normal text-muted-foreground">
          Chưa có cột nào — bấm &quot;+ Thêm cột&quot;.
        </Label>
      )}
    </div>
  );
}
