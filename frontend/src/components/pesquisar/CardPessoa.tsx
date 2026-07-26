import { ChevronRight, User } from 'lucide-react'
import { tmdbImage, getTitle, type TMDBPerson, type TMDBMovie, type TMDBSerie } from '../../lib/api'

interface Props {
  person: TMDBPerson
}

const DEPARTAMENTO: Record<string, string> = {
  Acting: 'Ator/Atriz',
  Directing: 'Diretor(a)',
  Writing: 'Roteirista',
  Production: 'Produtor(a)',
  Sound: 'Som',
  Camera: 'Câmera',
  Editing: 'Edição',
  'Visual Effects': 'Efeitos Visuais',
  Crew: 'Equipe',
  Art: 'Arte',
  Costume: 'Figurino',
  Lighting: 'Iluminação',
}

export function CardPessoa({ person }: Props) {
  // w342 para qualidade melhor que w185
  const foto = tmdbImage(person.profile_path, 'w342')

  const cargo = DEPARTAMENTO[person.known_for_department] ?? person.known_for_department

  const knownFor = person.known_for
    .slice(0, 2)
    .map((item) => getTitle(item as TMDBMovie | TMDBSerie))
    .filter(Boolean)
    .join(' • ')

  return (
    <article
      className="group flex items-center gap-3 rounded-2xl border border-[#2a2a38] bg-[#1c1c24] p-3 transition-all duration-200 hover:border-[#6366f1]/40 hover:bg-[#22222d] cursor-pointer"
      aria-label={person.name}
    >
      {/* Foto — tamanho fixo para nao quebrar sem imagem */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#16161c] ring-2 ring-[#2a2a38] transition-all group-hover:ring-[#6366f1]/50">
        {foto ? (
          <img
            src={foto}
            alt={person.name}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User size={22} className="text-[#5a5a72]" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-[#f1f1f3]">
          {person.name}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-[#6366f1]">
          {cargo}
        </p>
        {knownFor && (
          <p className="mt-0.5 truncate text-xs text-[#5a5a72]">
            {knownFor}
          </p>
        )}
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-[#2a2a38] transition-colors group-hover:text-[#6366f1]"
        aria-hidden="true"
      />
    </article>
  )
}
