"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type EstadoGuardado = "inactivo" | "guardando" | "guardado" | "error";

interface AutoSaveFormProps {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  successKey: string;
}

const DEMORA_GUARDADO_MS = 500;
const DEMORA_OCULTAR_MS = 2_000;

export function AutoSaveForm({ action, children, successKey }: AutoSaveFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocultarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [estado, setEstado] = useState<EstadoGuardado>("inactivo");

  const ocultarDespues = useCallback(() => {
    if (ocultarRef.current) clearTimeout(ocultarRef.current);
    ocultarRef.current = setTimeout(() => setEstado("inactivo"), DEMORA_OCULTAR_MS);
  }, []);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("ok") !== successKey) return;

    const mostrarGuardado = window.setTimeout(() => setEstado("guardado"), 0);
    parametros.delete("ok");
    const consulta = parametros.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${consulta ? `?${consulta}` : ""}${window.location.hash}`);
    ocultarDespues();
    return () => window.clearTimeout(mostrarGuardado);
  }, [ocultarDespues, successKey]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (ocultarRef.current) clearTimeout(ocultarRef.current);
  }, []);

  function programarGuardado() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (ocultarRef.current) clearTimeout(ocultarRef.current);

    const formulario = formRef.current;
    if (!formulario?.checkValidity()) {
      formulario?.reportValidity();
      return;
    }

    setEstado("guardando");
    debounceRef.current = setTimeout(() => formulario.requestSubmit(), DEMORA_GUARDADO_MS);
  }

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    if (!evento.currentTarget.checkValidity()) {
      evento.preventDefault();
      evento.currentTarget.reportValidity();
    }
  }

  return (
    <form ref={formRef} action={action} onChange={programarGuardado} onSubmit={manejarEnvio} className="auto-save-form">
      <span className={`auto-save-status auto-save-status-${estado}`} role="status" aria-live="polite">
        {estado === "guardando" && "Guardando…"}
        {estado === "guardado" && <><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3 8.2 3 3L13 4.8" /></svg>Guardado</>}
        {estado === "error" && "No se pudo guardar"}
      </span>
      {children}
    </form>
  );
}
