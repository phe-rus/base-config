export const getBaseURL = () => {
	return import.meta.env.BETTER_AUTH_URL || import.meta.env.VITE_ORIGIN
}
