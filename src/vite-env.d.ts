/// <reference types="vite/client" />

// `inert` bestaat in de browser maar zit nog niet in de React 18-typings.
// Kaarten die niet in beeld zijn worden ermee buiten het toetsenbordbereik
// gehouden — nodig zodra kaarten knoppen en links krijgen.
import 'react'
declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: string | undefined
  }
}
