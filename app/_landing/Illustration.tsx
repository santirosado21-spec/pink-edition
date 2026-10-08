"use client";

import { useId } from "react";

export function LandingSpeaker() {
  const id = useId();
  return (
    <svg
      className="speaker-art"
      viewBox="0 0 300 470"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-skin`}
          x1="111"
          y1="103"
          x2="199"
          y2="251"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f8cbd7" />
          <stop offset="1" stopColor="#ba698a" />
        </linearGradient>
        <linearGradient
          id={`${id}-shirt`}
          x1="72"
          y1="286"
          x2="251"
          y2="471"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#343449" />
          <stop offset="1" stopColor="#131322" />
        </linearGradient>
      </defs>
      <path
        d="M52 470L62 322Q66 286 119 272L178 272Q234 286 239 322L254 470"
        fill={`url(#${id}-shirt)`}
      />
      <path
        d="M127 239L125 278Q148 302 174 278L169 232"
        fill={`url(#${id}-skin)`}
      />
      <path
        d="M103 168Q100 115 148 111Q195 112 194 168L186 215Q180 248 149 256Q115 246 109 214Z"
        fill={`url(#${id}-skin)`}
      />
      <path
        d="M104 186Q91 163 97 133Q103 103 136 100Q158 83 185 111Q210 128 194 184L184 157Q179 143 177 128Q148 157 113 153Z"
        fill="#272235"
      />
      <path
        d="M108 181Q94 174 100 198L111 210M190 181Q203 174 197 198L186 210"
        fill="#da94ab"
      />
      <path
        d="M121 185L132 185M167 185L178 185"
        stroke="#714358"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M149 187L145 205L151 206M136 222Q149 228 163 220"
        stroke="#a4607a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M107 286Q149 324 192 285M93 339L86 468M214 337L226 468"
        stroke="#626074"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      <path
        d="M132 294L145 330L158 301"
        stroke="#f8cbd7"
        strokeOpacity=".35"
        strokeWidth="2"
      />
      <rect x="166" y="302" width="9" height="16" rx="4" fill="#0f1021" />
      <path d="M170 319L175 342" stroke="#0f1021" strokeWidth="2" />
    </svg>
  );
}

export function LandingRings() {
  return (
    <svg
      className="rings-art"
      viewBox="0 0 400 500"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1">
        <ellipse
          cx="200"
          cy="245"
          rx="180"
          ry="103"
          transform="rotate(-35 200 245)"
        />
        <ellipse
          cx="200"
          cy="245"
          rx="180"
          ry="133"
          transform="rotate(-35 200 245)"
        />
        <ellipse
          cx="200"
          cy="245"
          rx="180"
          ry="163"
          transform="rotate(-35 200 245)"
        />
        <ellipse
          cx="200"
          cy="245"
          rx="180"
          ry="193"
          transform="rotate(-35 200 245)"
        />
      </g>
      <circle cx="57" cy="298" r="5" fill="currentColor" />
      <circle cx="339" cy="144" r="5" fill="currentColor" />
    </svg>
  );
}
