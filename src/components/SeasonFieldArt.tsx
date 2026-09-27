/** Decorative field contours; no forecast, progress or farm measurements implied. */
export default function SeasonFieldArt() {
  return <svg viewBox="0 0 420 320" fill="none" aria-hidden="true">
    <circle cx="290" cy="117" r="98" stroke="currentColor" strokeOpacity=".1"/>
    <circle cx="290" cy="117" r="71" stroke="currentColor" strokeOpacity=".17"/>
    <circle cx="290" cy="117" r="44" fill="currentColor" fillOpacity=".09"/>
    <g stroke="currentColor" strokeWidth="1.2" strokeOpacity=".27">
      <path d="M10 320C24 227 165 274 205 207S297 181 420 140"/>
      <path d="M45 330C45 249 186 288 227 219S312 197 430 161"/>
      <path d="M83 340C79 271 207 307 251 232S331 217 442 182"/>
      <path d="M123 345C114 295 233 324 276 247S351 238 456 204"/>
      <path d="M164 356C150 319 260 343 302 263S379 262 469 228"/>
      <path d="M207 363C191 343 290 362 330 281S404 288 482 254"/>
    </g>
    <g transform="translate(255 66) rotate(24 32 64)" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M31 132V13"/>
      <path d="M31 92C11 93 4 82 4 69c17 0 27 10 27 23ZM31 69C11 70 4 59 4 46c17 0 27 10 27 23ZM31 46C15 46 9 37 10 25c14 1 21 10 21 21Z" fill="currentColor" fillOpacity=".18"/>
      <path d="M32 104c20 1 27-10 27-23-17 0-27 10-27 23ZM32 81c20 1 27-10 27-23-17 0-27 10-27 23ZM32 58c16 0 22-9 21-21-14 1-21 10-21 21ZM31 25C20 16 22 5 31 0c9 5 11 16 0 25Z" fill="currentColor" fillOpacity=".3"/>
    </g>
    <g fill="currentColor"><circle cx="193" cy="70" r="3" opacity=".5"/><circle cx="362" cy="187" r="3" opacity=".5"/><circle cx="372" cy="47" r="2" opacity=".3"/></g>
  </svg>
}
