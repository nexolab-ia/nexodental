"use client";

import { type ReactNode, useId, useRef, useState } from "react";
import NextImage from "next/image";

type OrgLogoPickerProps = { name: string; initial?: string | null; children?: ReactNode };
const IMAGE_ERROR = "No pudimos leer la imagen. Prueba con PNG o JPG de máximo 200×200 px.";

export function OrgLogoPicker({ name, initial = null, children }: OrgLogoPickerProps) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(initial);
  const [value, setValue] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseFile(file?: File): void {
    if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(IMAGE_ERROR);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError(IMAGE_ERROR);
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => setError(IMAGE_ERROR);
      image.onload = () => {
        const scale = Math.min(1, 200 / image.width, 200 / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return setError(IMAGE_ERROR);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png", 0.9);
        setPreview(dataUrl);
        setValue(dataUrl);
        setCleared(false);
        setError(null);
      };
      image.src = typeof reader.result === "string" ? reader.result : "";
    };
    reader.readAsDataURL(file);
  }

  function clearLogo(): void {
    setPreview(null);
    setValue(null);
    setCleared(true);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return <div className="logo-picker">
    <div className="logo-preview">
      {preview ? <NextImage src={preview} alt="Logo de la clínica" width={64} height={64} unoptimized/> : <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7.5 8.4 5h7.2L17 7.5h2A2 2 0 0 1 21 9.5v8A2 2 0 0 1 19 19H5a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2h2Z"/><circle cx="12" cy="13" r="3.25"/></svg><span>Sin imagen</span></>}
    </div>
    <div className="logo-caption">
      {children}
      <div className="logo-actions">
        <label className="button" htmlFor={inputId}>Cambiar imagen</label>
        {(preview || initial) && <button type="button" className="button" onClick={clearLogo}>Quitar</button>}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
    <input ref={fileInput} id={inputId} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])}/>
    {value && <input type="hidden" name={name} value={value}/>} {cleared && <input type="hidden" name="logoClear" value="1"/>}
  </div>;
}
