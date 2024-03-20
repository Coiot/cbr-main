<template>
	<transition name="fade">
		<div class="album-list">
			<h1>Latest Release</h1>
			<router-link
				:to="post.path"
				tag="div"
				v-for="(post, index) in albums"
				:key="post.title"
				class="post"
				:style="{ backgroundImage: `url(${post.frontmatter.image})` }"
				:tabindex="0">
				<div class="title-info">
					<p>{{ post.frontmatter.title }}</p>
					<span v-if="post.frontmatter.edition">{{
						post.frontmatter.edition
					}}</span>
					<span v-else-if="post.frontmatter.pr">{{
						post.frontmatter.pr
					}}</span>
				</div>

				<div class="album-info">
					<p>{{ post.frontmatter.narrated_by }}</p>
					<span
						>Release Date: {{ post.frontmatter.release_date }}</span
					>
				</div>
			</router-link>
		</div>
	</transition>
</template>
<script>
export default {
	computed: {
		albums() {
			return this.$site.pages
				.filter(
					(x) =>
						x.path.startsWith("/albums/s4") &&
						!x.frontmatter.exclude
				)
				.sort(
					(a, b) =>
						new Date(b.frontmatter.date) -
						new Date(a.frontmatter.date)
				)
				.slice(0, 1);
		},
	},
};
</script>

<style scoped>
h1 {
	font-size: 3rem;
	font-weight: 800;
	line-height: 1;
}

.album-list {
	min-width: 74%;
	width: 100%;
	margin: 0;
}

.post {
	position: relative;
	width: 100%;
	height: 80vh;
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	box-shadow: 0 3px 0 0 #ffbf46;
	cursor: pointer;
	transition: all 0.2s ease-in-out;
}

.post:hover {
	box-shadow: 0 2px 0 0 #ffbf46;
	transform: scale(1.01);
}

img {
	width: 100%;
	line-height: 0;
	margin: 2rem 0;
}

.title-info {
	position: absolute;
	left: 0;
	top: 2rem;
	padding: 1.5rem 2rem;
	text-shadow: 2px 2px #083832;
	background: #202020;
	border: 1px double #fff;
	border-left: 0;
	box-shadow: 1px 4px 3px 0 rgba(19, 0, 0, 0.3);
	max-width: 550px;
}

.title-info p {
	display: inline-block;
	width: auto;
	font-size: 1.5rem;
	font-weight: 800;
	margin: 0;
}

.title-info span {
	margin: 0;
	margin-left: 0.5rem;
	font-size: 1.1rem;
}

.album-info {
	position: absolute;
	right: 0;
	bottom: 2rem;
	padding: 1.5rem 2rem;
	color: #1a1a1a;
	text-shadow: 2px 2px #eee;
	background: #fff;
	border: 1px double #1a1a1a;
	border-right: 0;
	box-shadow: -3px 4px 0 0 #ffbf46;
	max-width: 900px;
}

.album-info p {
	display: inline-block;
	width: auto;
	font-size: 1.15rem;
	font-weight: 800;
	margin: 0;
}

.album-info span {
	margin: 0;
	margin-left: 0.5rem;
	font-size: 1rem;
}

@media (max-width: 719px) {
	.album-list {
		margin: 2rem 0 0;
	}
}
</style>
