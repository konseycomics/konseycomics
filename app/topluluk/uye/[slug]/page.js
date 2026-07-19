import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Eye, MessageSquare, Pin, ShieldCheck } from 'lucide-react'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { buildMetadata, createSeoDescription } from '../../../lib/seo'
import { getCommunitySystemProfileBySlug } from '../../../lib/communityData'
import '../../forum.css'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const profile = await getCommunitySystemProfileBySlug(slug)
  if (!profile) return buildMetadata({ title: 'Üye Bulunamadı', description: 'Aradığın topluluk profili bulunamadı.', path: `/topluluk/uye/${slug}` })
  return buildMetadata({
    title: `${profile.kullanici_adi} | Konsey Forum`,
    description: createSeoDescription(profile.bio, `${profile.kullanici_adi} resmi Konsey Forum profili.`),
    path: `/topluluk/uye/${slug}`,
  })
}

export default async function SystemProfilePage({ params }) {
  const { slug } = await params
  const profile = await getCommunitySystemProfileBySlug(slug)
  if (!profile) notFound()

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <section className="site-section forum-page-inner forum-system-profile-page">
          <Link className="forum-system-back" href="/topluluk">Forumlara dön</Link>
          <header className="forum-system-profile-hero">
            <div className="forum-system-profile-avatar">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.kullanici_adi[0]}
            </div>
            <div>
              <span className="forum-system-official"><ShieldCheck size={14} /> Resmi Konsey hesabı</span>
              <h1>{profile.kullanici_adi}</h1>
              <div className="forum-team-badges forum-system-profile-badges"><span>KONSEY EKİBİ</span><span>{profile.ekip_rolu}</span></div>
              <p>{profile.bio}</p>
            </div>
          </header>

          <section className="forum-system-topics">
            <div className="forum-section-heading"><strong>Sabitlenen rehberler</strong><span>{profile.topics.length} konu</span></div>
            {profile.topics.map((topic) => (
              <Link href={`/topluluk/konu/${topic.slug}`} key={topic.id}>
                <span className="forum-system-topic-icon">{topic.sabitlendi ? <Pin size={16} /> : <MessageSquare size={16} />}</span>
                <span><strong>{topic.baslik}</strong><small>{topic.kategori}</small></span>
                <span className="forum-system-topic-stats"><MessageSquare size={13} /> {topic.yanit_sayisi || 0}<Eye size={13} /> {topic.goruntulenme_sayisi || 0}</span>
              </Link>
            ))}
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}
