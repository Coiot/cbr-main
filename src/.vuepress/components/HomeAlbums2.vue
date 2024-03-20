<template>
	<transition name="fade">
		<section>
			<h2>Recent Episodes</h2>
			<div class="album-list">
				<router-link
					:to="post.path"
					tag="div"
					v-for="(post, index) in albums"
					:key="post.title"
					class="post"
					:tabindex="0">
					<img :src="post.frontmatter.image" />

					<div class="album-info">
						<p v-if="post.frontmatter.edition">
							{{ post.frontmatter.edition }}
						</p>
						<p v-else>{{ post.frontmatter.pr }}</p>
						<span>{{ post.frontmatter.title }}</span>
						<!-- <span>Release Date: {{ post.frontmatter.release_date }}</span> -->
					</div>
				</router-link>
			</div>
		</section>
	</transition>
</template>

<script>
export default {
	computed: {
		albums() {
			return this.$site.pages
				.filter(
					(x) =>
						(x.path.startsWith("/albums/s3") ||
							x.path.startsWith("/albums/s4")) &&
						!x.frontmatter.exclude
				)
				.sort(
					(a, b) =>
						new Date(b.frontmatter.date) -
						new Date(a.frontmatter.date)
				)
				.slice(1, 5);
		},
	},
};
</script>

<style scoped>
h2 {
	font-size: 3rem;
	font-weight: 800;
	line-height: 1;
	margin-top: 0.5rem;
}

.album-list {
	display: flex;
	justify-content: space-between;
	width: 100%;
	margin: 0.5em 0 3em;
}

.post {
	display: flex;
	flex-direction: column;
	width: 23%;
	max-height: 40vh;
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	border-bottom: 5px solid #ffbf46;
	box-shadow: 0 5px 2px 0 rgba(8, 56, 50, 0.2);
	cursor: pointer;
	transition: all 0.2s ease-in-out;
}

.post:hover {
	box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
	transform: scale(1.01);
}

img {
	width: 100%;
	height: 12em;
	object-fit: cover;
	margin: 0;
}

.album-info {
	flex-grow: 1;
	padding: 1rem 0.8rem 2rem;
	color: #1a1a1a;
	background: #fff;
	border-right: 0;
	max-width: 800px;
}

.album-info p {
	display: inline-block;
	width: 100%;
	font-size: 1.1rem;
	font-weight: 700;
	margin: 0 0 0 0.5rem;
}

.album-info span {
	display: inline-block;
	width: auto;
	margin: 0;
	margin-left: 0.5rem;
	font-size: 1rem;
}

@media (max-width: 719px) {
	.album-list {
		flex-direction: column;
		justify-content: none;
		margin: 0;
	}

	.post {
		width: 100%;
		margin-bottom: 2rem;
	}
}
</style>
