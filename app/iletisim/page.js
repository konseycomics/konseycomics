'use client'

import { useMemo, useState } from 'react'
import Script from 'next/script'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const sosyalKanallar = [
  { baslik: 'Instagram', link: 'https://instagram.com/konseycomics' },
]

const instagramProfil = 'https://instagram.com/konseycomics'

const konuSecenekleri = [
  'Genel İletişim',
  'Telif Bildirimi',
  'İşbirliği',
  'Teknik Destek',
  'Ekip Başvurusu',
]

export default function IletisimPage() {
  const [isim, setIsim] = useState('')
  const [email, setEmail] = useState('')
  const [konu, setKonu] = useState('Genel İletişim')
  const [mesaj, setMesaj] = useState('')

  const mailtoLink = useMemo(() => {
    const subjectParts = [konu]
    if (isim.trim()) subjectParts.push(`- ${isim.trim()}`)

    const body = [
      isim.trim() ? `Isim: ${isim.trim()}` : null,
      email.trim() ? `E-posta: ${email.trim()}` : null,
      `Konu: ${konu}`,
      '',
      mesaj.trim() || 'Mesajinizi buraya yazabilirsiniz.',
    ]
      .filter(Boolean)
      .join('\n')

    return `mailto:konseycomics@gmail.com?subject=${encodeURIComponent(subjectParts.join(' '))}&body=${encodeURIComponent(body)}`
  }, [email, isim, konu, mesaj])

  return (
    <>
      <Navbar />
      <Script
        src="https://platform.instagram.com/en_US/embeds.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined' && window.instgrm?.Embeds?.process) {
            window.instgrm.Embeds.process()
          }
        }}
      />
      <main
        style={{
          background: '#0b0b0b',
          minHeight: '100vh',
        }}
      >
        <section
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '56px 24px 120px',
          }}
        >
          <section
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '56px',
            }}
          >
            <div
              style={{
                display: 'grid',
                justifyItems: 'center',
                textAlign: 'center',
                gap: '18px',
                marginBottom: '42px',
                padding: '0 12px',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  color: '#fff',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(64px, 11vw, 116px)',
                  lineHeight: 0.92,
                  letterSpacing: '0.02em',
                }}
              >
                İLETİŞİM
              </h1>

              <p
                style={{
                  maxWidth: '62ch',
                  margin: 0,
                  color: 'rgba(255,255,255,0.62)',
                  fontSize: '15px',
                  lineHeight: 1.8,
                }}
              >
                Telif, is birligi, topluluk, teknik destek ya da genel sorular icin dogrudan bize ulasabilecegin tum
                kanallar burada. Bizim estetikte ama daha islevsel bir iletisim alani kuruyoruz.
              </p>
            </div>

            <div
              className="iletisim-layout"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(320px, 0.92fr) minmax(360px, 1.08fr)',
                gap: '42px',
                alignItems: 'start',
              }}
            >
              <div
                className="iletisim-left"
                style={{
                  display: 'grid',
                  gap: '34px',
                  alignContent: 'start',
                }}
              >
                <div style={{ display: 'grid', gap: '28px' }}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div>
                        <div
                          style={{
                            color: 'rgba(255,255,255,0.46)',
                            fontSize: '12px',
                            letterSpacing: '0.7px',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          E-POSTA
                        </div>
                        <a
                          href="mailto:destek@konseycomics.com"
                          style={{
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '22px',
                            lineHeight: 1.25,
                            fontWeight: 700,
                          }}
                        >
                          destek@konseycomics.com
                        </a>
                      </div>

                      <div>
                        <div
                          style={{
                            color: 'rgba(255,255,255,0.46)',
                            fontSize: '12px',
                            letterSpacing: '0.7px',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          INSTAGRAM
                        </div>
                        <a
                          href={instagramProfil}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '22px',
                            lineHeight: 1.25,
                            fontWeight: 700,
                          }}
                        >
                          @konseycomics
                        </a>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.46)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '1.1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Sosyal Medya
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      {sosyalKanallar.map((kanal) => (
                        <a
                          key={kanal.baslik}
                          href={kanal.link}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '46px',
                            padding: '0 18px',
                            borderRadius: '0',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 800,
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {kanal.baslik}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '14px',
                    }}
                  >
                  </div>
                </div>
              </div>

              <div
                className="iletisim-right"
                style={{
                  display: 'grid',
                  gap: '18px',
                }}
              >
                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '28px',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '28px',
                  }}
                >
                  <div
                    style={{
                      color: '#fff',
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '54px',
                      lineHeight: 0.95,
                      marginBottom: '14px',
                    }}
                  >
                    TELİF & İŞBİRLİĞİ
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '14px',
                      lineHeight: 1.8,
                    }}
                  >
                    Konsey Comics olarak telif konusunda son derece hassas davraniyoruz. Hak sahiplerinden gelen resmi
                    bildirimleri dikkatle inceler, gerekli durumlarda hizli aksiyon aliriz. Is birligi taleplerinde de
                    sureci net ve dogrudan ilerletmeyi tercih ediyoruz.
                  </p>
                </div>

                <div
                  className="iletisim-form-panel"
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '28px',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '32px',
                  }}
                >
                <div
                  className="iletisim-form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '22px 18px',
                  }}
                >
                  <label style={{ display: 'grid', gap: '10px' }}>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.46)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      İSİM SOYİSİM / ŞİRKET
                    </span>
                    <input
                      value={isim}
                      onChange={(e) => setIsim(e.target.value)}
                      placeholder="Clark Kent"
                      style={inputStili}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '10px' }}>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.46)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      E-POSTA
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ckent@example.com"
                      style={inputStili}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '10px', gridColumn: '1 / -1' }}>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.46)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Konu
                    </span>
                    <select value={konu} onChange={(e) => setKonu(e.target.value)} style={inputStili}>
                      {konuSecenekleri.map((secenek) => (
                        <option key={secenek} value={secenek} style={{ background: '#171717', color: '#fff' }}>
                          {secenek}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: '10px', gridColumn: '1 / -1' }}>
                    <span
                      style={{
                        color: 'rgba(255,255,255,.46)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Mesajınız
                    </span>
                    <textarea
                      value={mesaj}
                      onChange={(e) => setMesaj(e.target.value)}
                      placeholder="Mesajınızı buraya yazın..."
                      style={{
                        ...inputStili,
                        minHeight: '220px',
                        resize: 'vertical',
                      }}
                    />
                  </label>
                </div>

                <a
                  href={mailtoLink}
                  style={{
                    marginTop: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '58px',
                    background: '#f5f5f0',
                    borderRadius: '18px',
                    color: '#080808',
                    textDecoration: 'none',
                    fontSize: '17px',
                    fontWeight: 800,
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                  }}
                >
                  MESAJ GÖNDER →
                </a>
              </div>
              </div>
            </div>
          </section>
        </section>
      </main>
      <Footer />
      <style jsx>{`
        .iletisim-layout {
          align-items: start;
        }

        @media (max-width: 1100px) {
          .iletisim-layout {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }

          .iletisim-left,
          .iletisim-right {
            max-width: 820px;
            width: 100%;
            margin: 0 auto;
          }
        }

        @media (max-width: 720px) {
          .iletisim-form-panel {
            padding: 22px !important;
            border-radius: 22px !important;
          }

          .iletisim-form-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
        }

        @media (max-width: 640px) {
          .iletisim-left,
          .iletisim-right {
            max-width: 100%;
          }
        }
      `}</style>
    </>
  )
}

const inputStili = {
  width: '100%',
  minHeight: '56px',
  border: 'none',
  outline: 'none',
  background: 'rgba(255,255,255,0.02)',
  color: '#fff',
  fontSize: '17px',
  padding: '0 2px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  boxSizing: 'border-box',
}
