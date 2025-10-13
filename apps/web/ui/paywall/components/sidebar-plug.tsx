export const SidebarPlug = () => {
  return (
    <div className="fixed left-0 top-0 z-50 h-dvh w-screen bg-transparent transition-[background-color,backdrop-filter] max-md:pointer-events-none md:sticky md:z-auto md:w-full md:bg-transparent">
      <div className="relative h-full w-[240px] max-w-full -translate-x-full bg-neutral-100 transition-transform md:translate-x-0">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none absolute -left-2/3 bottom-0 aspect-square w-[140%] translate-y-1/4 rounded-full bg-[conic-gradient(from_32deg_at_center,#855AFC_0deg,#3A8BFD_72deg,#00FFF9_144deg,#5CFF80_198deg,#EAB308_261deg,#f00_360deg)] opacity-15 blur-[75px]"></div>
        </div>
        <div className="scrollbar-hide opacity-1 relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden">
          <nav className="relative flex grow flex-col p-3 text-neutral-500">
            <div className="relative flex items-start justify-between gap-1 pb-3">
              <div className="relative mb-1 rounded-md px-1 opacity-100 outline-none transition-opacity">
                <div className="flex items-center gap-1.5">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary h-5 w-5"
                  >
                    <rect
                      x="14.875"
                      y="2.625"
                      width="10.5"
                      height="10.5"
                      rx="2.625"
                      fill="currentColor"
                    ></rect>
                    <path
                      d="M20.125 10.5C21.5747 10.5 22.75 9.32475 22.75 7.875C22.75 6.42525 21.5747 5.25 20.125 5.25C18.6753 5.25 17.5 6.42525 17.5 7.875C17.5 9.32475 18.6753 10.5 20.125 10.5Z"
                      fill="white"
                    ></path>
                    <rect
                      x="2.625"
                      y="2.625"
                      width="10.5"
                      height="10.5"
                      rx="2.625"
                      fill="currentColor"
                    ></rect>
                    <path
                      d="M7.875 10.5C9.32475 10.5 10.5 9.32475 10.5 7.875C10.5 6.42525 9.32475 5.25 7.875 5.25C6.42525 5.25 5.25 6.42525 5.25 7.875C5.25 9.32475 6.42525 10.5 7.875 10.5Z"
                      fill="white"
                    ></path>
                    <rect
                      x="2.625"
                      y="14.875"
                      width="10.5"
                      height="10.5"
                      rx="2.625"
                      fill="currentColor"
                    ></rect>
                    <path
                      d="M7.875 22.75C9.32475 22.75 10.5 21.5747 10.5 20.125C10.5 18.6753 9.32475 17.5 7.875 17.5C6.42525 17.5 5.25 18.6753 5.25 20.125C5.25 21.5747 6.42525 22.75 7.875 22.75Z"
                      fill="white"
                    ></path>
                    <path
                      d="M16.6246 18.3741C17.5908 18.3741 18.3741 17.5908 18.3741 16.6246C18.3741 15.6583 17.5908 14.875 16.6246 14.875C15.6583 14.875 14.875 15.6583 14.875 16.6246C14.875 17.5908 15.6583 18.3741 16.6246 18.3741Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M23.6255 18.3741C24.5918 18.3741 25.3751 17.5908 25.3751 16.6246C25.3751 15.6583 24.5918 14.875 23.6255 14.875C22.6593 14.875 21.876 15.6583 21.876 16.6246C21.876 17.5908 22.6593 18.3741 23.6255 18.3741Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M16.6246 25.375C17.5908 25.375 18.3741 24.5917 18.3741 23.6254C18.3741 22.6592 17.5908 21.8759 16.6246 21.8759C15.6583 21.8759 14.875 22.6592 14.875 23.6254C14.875 24.5917 15.6583 25.375 16.6246 25.375Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M20.1246 21.8746C21.0908 21.8746 21.8741 21.0913 21.8741 20.1251C21.8741 19.1588 21.0908 18.3755 20.1246 18.3755C19.1583 18.3755 18.375 19.1588 18.375 20.1251C18.375 21.0913 19.1583 21.8746 20.1246 21.8746Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                  <div className="font-default text-neutral text-lg">
                    <span className="font-medium">Get</span>
                    <span className="font-bold">QR</span>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute rounded-md px-1 opacity-0 outline-none transition-opacity">
                <div className="py group -my-1 -ml-1 flex items-center gap-2 py-2 pr-1 text-sm font-medium text-neutral-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-chevron-left size-4 text-neutral-500 transition-transform duration-100"
                  >
                    <path d="m15 18-6-6 6-6"></path>
                  </svg>
                  Settings
                </div>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <button
                  className="group relative rounded-full outline-none ring-offset-1 ring-offset-neutral-100 transition-all sm:inline-flex"
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="radix-:r4:"
                  data-state="closed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-circle-user-round size-6 border-none text-neutral-500 duration-75 sm:size-6"
                  >
                    <path d="M18 20a6 6 0 0 0-12 0"></path>
                    <circle cx="12" cy="10" r="4"></circle>
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                </button>
              </div>
            </div>
            <div className="relative w-full grow">
              <div className="opacity-1 relative left-0 top-0 flex size-full flex-col md:transition-[opacity,transform] md:duration-300">
                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex flex-col gap-0.5">
                    <div>
                      <div
                        data-active="true"
                        className="group flex items-center gap-2.5 rounded-md bg-blue-100/50 p-2 text-sm font-medium leading-none text-blue-600 outline-none transition-[background-color,color,font-weight] duration-75"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          role="img"
                          className="iconify iconify--mage h-5 w-5"
                          width="1em"
                          height="1em"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M9.433 5.833h-2.7a.9.9 0 0 0-.9.9v2.7a.9.9 0 0 0 .9.9h2.7a.9.9 0 0 0 .9-.9v-2.7a.9.9 0 0 0-.9-.9m0 7.815h-2.7a.9.9 0 0 0-.9.9v2.7a.9.9 0 0 0 .9.9h2.7a.9.9 0 0 0 .9-.9v-2.7a.9.9 0 0 0-.9-.9m7.834-7.815h-2.7a.9.9 0 0 0-.9.9v2.7a.9.9 0 0 0 .9.9h2.7a.9.9 0 0 0 .9-.9v-2.7a.9.9 0 0 0-.9-.9m0 7.834h-2.7a.9.9 0 0 0-.9.9v2.7a.9.9 0 0 0 .9.9h2.7a.9.9 0 0 0 .9-.9v-2.7a.9.9 0 0 0-.9-.9m3.983-4.75V5.833a3.083 3.083 0 0 0-3.083-3.083h-3.084m0 18.5h3.084a3.083 3.083 0 0 0 3.083-3.083v-3.084m-18.5 0v3.084a3.083 3.083 0 0 0 3.083 3.083h3.084m0-18.5H5.833A3.083 3.083 0 0 0 2.75 5.833v3.084"
                          ></path>
                        </svg>
                        My QR Codes
                      </div>
                    </div>
                    <div>
                      <div
                        data-active="false"
                        className="group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 outline-none transition-[background-color,color,font-weight] duration-75"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          role="img"
                          className="iconify iconify--streamline h-5 w-5"
                          width="1em"
                          height="1em"
                          viewBox="0 0 14 14"
                        >
                          <g
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M.5.5v13h13"></path>
                            <path d="M3.5 6.5L6 9l4-6l3.5 2.5"></path>
                          </g>
                        </svg>
                        Statistics
                      </div>
                    </div>
                  </div>
                </div>
                <div className="opacity-1 -mx-3 flex grow transform-none flex-col justify-end" />
              </div>
              <div
                className="pointer-events-none absolute left-0 top-0 flex size-full translate-x-full flex-col opacity-0 md:transition-[opacity,transform] md:duration-300"
                aria-hidden="true"
              >
                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="mb-2 pl-1 text-sm text-neutral-500">
                      Account
                    </div>
                    <div>
                      <div
                        data-active="false"
                        className="group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 outline-none transition-[background-color,color,font-weight] duration-75"
                      >
                        <svg
                          viewBox="0 0 18 18"
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-4 text-neutral-500 transition-colors duration-75"
                        >
                          <g fill="currentColor">
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="6.25"
                              x2="9"
                              y1="4.237"
                              y2="9"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="6.25"
                              x2="9"
                              y1="13.764"
                              y2="9"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="14.5"
                              x2="9"
                              y1="9"
                              y2="9"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="9"
                              x2="9"
                              y1="1.75"
                              y2="3.5"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="2.721"
                              x2="4.237"
                              y1="5.375"
                              y2="6.25"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="1.75"
                              x2="3.5"
                              y1="9"
                              y2="9"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="16.25"
                              x2="14.5"
                              y1="9"
                              y2="9"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="2.721"
                              x2="4.237"
                              y1="12.625"
                              y2="11.75"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="9"
                              x2="9"
                              y1="16.25"
                              y2="14.5"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="12.625"
                              x2="11.75"
                              y1="15.279"
                              y2="13.763"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="5.375"
                              x2="6.25"
                              y1="15.279"
                              y2="13.763"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="15.279"
                              x2="13.763"
                              y1="12.625"
                              y2="11.75"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="15.279"
                              x2="13.763"
                              y1="5.375"
                              y2="6.25"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="12.625"
                              x2="11.75"
                              y1="2.721"
                              y2="4.237"
                            ></line>
                            <line
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              x1="5.375"
                              x2="6.25"
                              y1="2.721"
                              y2="4.237"
                            ></line>
                            <circle
                              cx="9"
                              cy="9"
                              fill="none"
                              r="5.5"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                            ></circle>
                          </g>
                        </svg>
                        General
                      </div>
                    </div>
                    <div>
                      <div
                        data-active="false"
                        className="group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 outline-none transition-[background-color,color,font-weight] duration-75"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          role="img"
                          className="iconify iconify--ion size-4 text-neutral-500 transition-colors duration-75"
                          width="1em"
                          height="1em"
                          viewBox="0 0 512 512"
                        >
                          <rect
                            width="416"
                            height="320"
                            x="48"
                            y="96"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="32"
                            rx="56"
                            ry="56"
                          ></rect>
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-linejoin="round"
                            stroke-width="60"
                            d="M48 192h416M128 300h48v20h-48z"
                          ></path>
                        </svg>
                        Plans and Payments
                      </div>
                    </div>
                    <div>
                      <div
                        data-active="false"
                        className="group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 outline-none transition-[background-color,color,font-weight] duration-75"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          role="img"
                          className="iconify iconify--iconoir size-4 text-neutral-500 transition-colors duration-75"
                          width="1em"
                          height="1em"
                          viewBox="0 0 24 24"
                        >
                          <g
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                          >
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10"></path>
                            <path d="M9 9c0-3.5 5.5-3.5 5.5 0c0 2.5-2.5 2-2.5 5m0 4.01l.01-.011"></path>
                          </g>
                        </svg>
                        Help Center
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};
