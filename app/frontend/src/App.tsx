import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './components/home/HomePage'
import { MapaPreditivoPage } from './components/predictive/MapaPreditivoPage'
import { ReportProvider } from './state/ReportProvider'
import { pushArea, pushHome, readAreaFromUrl } from './state/areaRoute'
import { clearView, pushPredictive, readViewFromUrl } from './state/viewRoute'

export default function App() {
  // Fonte de verdade da navegação: a query ?area da URL.
  // null => página inicial (panorama); número => relatório da área.
  const [area, setArea] = useState<number | null>(readAreaFromUrl)
  // Modo de topo da aba Mapa Preditivo: ?view=preditivo.
  const [view, setView] = useState<'preditivo' | null>(readViewFromUrl)

  // Acompanha os botões voltar/avançar do navegador.
  useEffect(() => {
    const onPop = () => {
      setArea(readAreaFromUrl())
      setView(readViewFromUrl())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openPredictive = () => {
    pushPredictive()
    setView('preditivo')
  }

  if (view === 'preditivo') {
    return <MapaPreditivoPage onGoHome={() => { clearView(); setView(null); setArea(null) }} />
  }

  if (area == null) {
    return (
      <HomePage
        onSelectArea={(id) => {
          pushArea(id)
          setArea(id)
        }}
        onOpenPredictive={openPredictive}
      />
    )
  }

  return (
    <ReportProvider key={area} initialArea={area}>
      <AppShell
        onGoHome={() => {
          pushHome()
          setArea(null)
        }}
        onOpenPredictive={openPredictive}
      />
    </ReportProvider>
  )
}
