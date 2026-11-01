import Button from "@/components/ui/Button";
import ClipDropzone from "@/views/video/ClipDropzone";
import { videoText } from "@/views/video/consts/video-text.const";

type StockPickerProps = { files: File[]; onChange: (files: File[]) => void };

const VIDEO_FILE = /\.(mp4|mov|mkv|webm|m4v)$/i;

const StockPicker = ({ files, onChange }: StockPickerProps) => {
  const handleFiles = (added: File[]) => {
    onChange([...files, ...added.filter((file) => VIDEO_FILE.test(file.name))]);
  };
  const clear = () => onChange([]);
  const gib = files.reduce((sum, file) => sum + file.size, 0) / 1073741824;

  return (
    <section className="space-y-3">
      <h3 className="font-medium">{videoText.autoTitle}</h3>
      <p className="text-xs text-muted-foreground">{videoText.autoHint}</p>
      <ClipDropzone onFiles={handleFiles} />
      {files.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span>
            {files.length} {videoText.autoSelected} · {gib.toFixed(2)} GiB
          </span>
          <Button type="button" variant="outline" onClick={clear}>
            {videoText.autoClear}
          </Button>
        </div>
      )}
    </section>
  );
};

export default StockPicker;
